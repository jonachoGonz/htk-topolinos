-- Migration 008: Body measurements + PAR-Q + Storage RLS
-- Date: 2026-05-30
-- Purpose: Bloque verde de mejoras de patient management

-- ===================================================================
-- 1. Body measurements (circumferences)
-- ===================================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS waist_cm  NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS hip_cm    NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS chest_cm  NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS arm_cm    NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS thigh_cm  NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS calf_cm   NUMERIC(5,1);

-- ===================================================================
-- 2. PAR-Q (Physical Activity Readiness Questionnaire)
--    Standard 7-question screening before any training program.
-- ===================================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS parq_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS parq_answers JSONB DEFAULT '{}'::JSONB,
    -- {q1: bool, q2: bool, ..., q7: bool}
  ADD COLUMN IF NOT EXISTS parq_cleared BOOLEAN,
    -- true = all answers NO → cleared for activity
    -- false = at least one YES → requires medical clearance
  ADD COLUMN IF NOT EXISTS parq_clearance_notes TEXT;
    -- doctor's note / additional info when not cleared

-- ===================================================================
-- 3. Supabase Storage: patient-photos bucket policies
-- ===================================================================
-- IMPORTANT: The bucket itself must be created via Supabase Dashboard
-- (Storage → New bucket → name: "patient-photos", PUBLIC = true).
-- This SQL only adds the RLS policies on storage.objects so that:
--   - Anyone authenticated can READ (we'll keep the URL non-guessable via UUID)
--   - The patient or any teacher/admin can UPLOAD a photo to that patient's folder
--   - Same can DELETE

-- Drop existing if any (idempotent)
DROP POLICY IF EXISTS "Photos: read public bucket" ON storage.objects;
DROP POLICY IF EXISTS "Photos: upload own or by teacher/admin" ON storage.objects;
DROP POLICY IF EXISTS "Photos: delete own or by teacher/admin" ON storage.objects;

-- READ — anyone authenticated can read patient photos
CREATE POLICY "Photos: read public bucket"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'patient-photos');

-- UPLOAD — file must be in folder named with the patient's UUID
-- e.g. patient-photos/<patient_uuid>/avatar.jpg
-- Path validation: split first segment of the path = patient id
CREATE POLICY "Photos: upload own or by teacher/admin"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'patient-photos'
    AND (
      -- the user uploading is the patient themselves
      auth.uid()::text = (storage.foldername(name))[1]
      -- or a teacher/admin
      OR public.is_user_teacher()
      OR public.is_user_admin()
    )
  );

CREATE POLICY "Photos: delete own or by teacher/admin"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'patient-photos'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_user_teacher()
      OR public.is_user_admin()
    )
  );

-- ===================================================================
-- INSTRUCTIONS FOR USER:
-- ===================================================================
-- After running this migration, in Supabase Dashboard:
--   1. Storage → New bucket
--   2. Name:       patient-photos
--   3. Public:     YES (toggle on)
--   4. (optional) File size limit: 5 MB
--   5. Allowed MIME types: image/jpeg, image/png, image/webp
-- The RLS policies above will protect write access.
