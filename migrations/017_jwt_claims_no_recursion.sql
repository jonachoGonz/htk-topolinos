-- Migration 017: JWT app_metadata claims for RLS — definitive fix for recursion
-- Date: 2026-06-03
--
-- Problem: any RLS policy that queried `profiles` inside a SECURITY DEFINER
-- helper triggered Postgres's recursion detector AND poisoned PostgREST's
-- prepared statement cache. Even after dropping the bad policies, cached
-- plans kept rejecting the queries with 42P17.
--
-- Solution: stop querying `profiles` from policies. Mirror role + is_admin
-- into `auth.users.raw_app_meta_data` (JWT app_metadata) via trigger, and
-- write policies that read from `auth.jwt()`. Zero queries inside policies,
-- zero recursion possible.
--
-- Side effect: app_metadata travels in the JWT, so:
--   * Existing sessions get the claims on next sign-in or token refresh
--   * Changes to a user's role/is_admin only take effect after their token
--     refreshes (Supabase default: every hour, or on sign-in)

-- ===================================================================
-- 1. Sync trigger: profiles → auth.users.raw_app_meta_data
-- ===================================================================
CREATE OR REPLACE FUNCTION public.sync_profile_to_auth_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data =
        COALESCE(raw_app_meta_data, '{}'::jsonb)
        || jsonb_build_object(
             'role',     NEW.role,
             'is_admin', COALESCE(NEW.is_admin, FALSE)
           )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_profile_to_auth_metadata_trigger ON public.profiles;
CREATE TRIGGER sync_profile_to_auth_metadata_trigger
  AFTER INSERT OR UPDATE OF role, is_admin
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_to_auth_metadata();

-- ===================================================================
-- 2. Backfill existing users so current accounts have the claims
-- ===================================================================
UPDATE auth.users u
SET raw_app_meta_data =
      COALESCE(u.raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object(
           'role',     p.role,
           'is_admin', COALESCE(p.is_admin, FALSE)
         )
FROM public.profiles p
WHERE p.id = u.id
  AND p.role IS NOT NULL;

-- ===================================================================
-- 3. Drop ALL existing profiles policies and start clean
-- ===================================================================
DO $$
DECLARE p_name TEXT;
BEGIN
  FOR p_name IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', p_name);
  END LOOP;
END $$;

-- ===================================================================
-- 4. New policies — auth.jwt() based, NO query to profiles
-- ===================================================================

-- Every authenticated user can read and update their own row
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admins read all + update all (claim from JWT, no DB query)
CREATE POLICY "Admins read all profiles"
  ON public.profiles FOR SELECT
  USING (
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = TRUE
  );

CREATE POLICY "Admins update all profiles"
  ON public.profiles FOR UPDATE
  USING (
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = TRUE
  );

-- Teachers can read student rows (so the patient list keeps working)
CREATE POLICY "Teachers read student profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'teacher'
  );

-- ===================================================================
-- 5. Replace the helper bodies in place (no DROP — other policies on
--    plans, plan_templates, storage.objects, app_settings depend on
--    them by name. CREATE OR REPLACE keeps the OID; those policies
--    silently pick up the new auth.jwt() implementation, so they also
--    stop querying profiles and stop being recursion-vulnerable.)
-- ===================================================================
CREATE OR REPLACE FUNCTION public.is_user_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean,
    FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_user_teacher(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT auth.jwt() -> 'app_metadata' ->> 'role' = 'teacher';
$$;

GRANT EXECUTE ON FUNCTION public.is_user_admin(uuid)   TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_user_teacher(uuid) TO authenticated, anon;

-- ===================================================================
-- 7. Reload PostgREST schema (the helpers and policies changed)
-- ===================================================================
NOTIFY pgrst, 'reload schema';

-- ===================================================================
-- 8. Verification (run after migration)
-- ===================================================================
-- Should return 6 policies, no recursion possible:
--   SELECT policyname, cmd, qual FROM pg_policies
--     WHERE tablename = 'profiles' ORDER BY policyname;
--
-- Should return the backfilled metadata for your accounts:
--   SELECT u.email, u.raw_app_meta_data
--     FROM auth.users u
--     WHERE u.email IN ('profesor@test.com', 'estudiante@test.com');
