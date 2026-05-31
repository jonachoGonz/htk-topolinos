-- Migration 011: Auto-create profile on signup + backfill missing profiles
-- Date: 2026-05-30
-- Purpose: Fix issue where students sign up via auth.users but no profile row exists

-- ===================================================================
-- 0. Safety net — make sure columns referenced below exist
--    (email was added in migration 007 but some users had partial-apply)
-- ===================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS rut_dni TEXT;

-- ===================================================================
-- 1. Trigger: create profile when auth.users gets a new row
-- ===================================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, email)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- ===================================================================
-- 2. Backfill: create profile for any auth.users without one
-- ===================================================================
INSERT INTO public.profiles (id, full_name, role, email)
SELECT
  u.id,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1)
  ) AS full_name,
  COALESCE(u.raw_user_meta_data->>'role', 'student') AS role,
  u.email
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
