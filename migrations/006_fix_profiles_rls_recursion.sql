-- Migration 006: Fix infinite recursion in profiles RLS policies
-- Date: 2026-05-30
-- Problem: Migration 005 created policies that SELECT from `profiles` inside
-- `profiles`'s own RLS policy → triggers the same policy → infinite recursion.
-- Fix: use a SECURITY DEFINER helper function that bypasses RLS when checking is_admin.

-- ===================================================================
-- 1. Drop the recursive policies from migration 005
-- ===================================================================
DROP POLICY IF EXISTS "Admin can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can update profiles" ON profiles;
DROP POLICY IF EXISTS "Teachers can read student profiles" ON profiles;

-- Also drop the recursive policies from migration 004 if they affect profiles
DROP POLICY IF EXISTS "Admin can manage all plans" ON plans;
DROP POLICY IF EXISTS "Admin can manage all plan_templates" ON plan_templates;

-- ===================================================================
-- 2. Helper function — runs as SECURITY DEFINER so it bypasses RLS
-- ===================================================================
CREATE OR REPLACE FUNCTION public.is_user_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT COALESCE(is_admin, FALSE) INTO v_is_admin
  FROM profiles
  WHERE id = p_user_id;

  RETURN COALESCE(v_is_admin, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Make sure authenticated users can call it
GRANT EXECUTE ON FUNCTION public.is_user_admin(UUID) TO authenticated, anon;

-- Same idea for teacher role
CREATE OR REPLACE FUNCTION public.is_user_teacher(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT role INTO v_role
  FROM profiles
  WHERE id = p_user_id;

  RETURN v_role = 'teacher';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_user_teacher(UUID) TO authenticated, anon;

-- ===================================================================
-- 3. Re-create policies using the SECURITY DEFINER helpers (no recursion)
-- ===================================================================
CREATE POLICY "Admin can read all profiles"
  ON profiles
  FOR SELECT
  USING (public.is_user_admin());

CREATE POLICY "Admin can update profiles"
  ON profiles
  FOR UPDATE
  USING (public.is_user_admin());

CREATE POLICY "Teachers can read student profiles"
  ON profiles
  FOR SELECT
  USING (public.is_user_teacher());

CREATE POLICY "Admin can manage all plans"
  ON plans
  FOR ALL
  USING (public.is_user_admin());

CREATE POLICY "Admin can manage all plan_templates"
  ON plan_templates
  FOR ALL
  USING (public.is_user_admin());

-- ===================================================================
-- 4. Ensure base "users can read/update own profile" still works
-- (Should already exist, but add IF NOT EXISTS equivalent)
-- ===================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Users can read own profile'
  ) THEN
    CREATE POLICY "Users can read own profile"
      ON profiles
      FOR SELECT
      USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON profiles
      FOR UPDATE
      USING (auth.uid() = id);
  END IF;
END $$;
