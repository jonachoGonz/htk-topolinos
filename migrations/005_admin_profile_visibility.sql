-- Migration 005: Admin can read/manage all profiles
-- Date: 2026-05-30
-- Reason: Admin Plan Assignment needs to list every student, but existing
-- RLS on `profiles` likely only allows users to read their own row.

-- Allow admin to SELECT all profiles
DROP POLICY IF EXISTS "Admin can read all profiles" ON profiles;
CREATE POLICY "Admin can read all profiles"
  ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p2
      WHERE p2.id = auth.uid() AND p2.is_admin = TRUE
    )
  );

-- Allow admin to UPDATE profiles (e.g., assign roles, mark another admin)
DROP POLICY IF EXISTS "Admin can update profiles" ON profiles;
CREATE POLICY "Admin can update profiles"
  ON profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p2
      WHERE p2.id = auth.uid() AND p2.is_admin = TRUE
    )
  );

-- Make sure teachers can also read student profiles (existing functionality)
-- Only add if not already present
DROP POLICY IF EXISTS "Teachers can read student profiles" ON profiles;
CREATE POLICY "Teachers can read student profiles"
  ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p2
      WHERE p2.id = auth.uid() AND p2.role = 'teacher'
    )
  );
