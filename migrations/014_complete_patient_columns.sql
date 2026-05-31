-- Migration 014: Ensure all patient columns from 007 exist
-- Date: 2026-05-31
-- Several users reported migration 007 partially applied; this is idempotent
-- and completes whatever's missing.

ALTER TABLE profiles
  -- Identity
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS marital_status TEXT,
  ADD COLUMN IF NOT EXISTS has_children BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS num_children INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS profession TEXT,
  ADD COLUMN IF NOT EXISTS occupation TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  -- Body
  ADD COLUMN IF NOT EXISTS height_cm NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS body_fat_pct NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS muscle_mass_pct NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS bone_mass_pct NUMERIC(4,1),
  -- Goals
  ADD COLUMN IF NOT EXISTS activity_level TEXT,
  ADD COLUMN IF NOT EXISTS objective TEXT,
  ADD COLUMN IF NOT EXISTS handedness TEXT,
  -- Medical
  ADD COLUMN IF NOT EXISTS blood_type TEXT,
  ADD COLUMN IF NOT EXISTS allergies TEXT,
  ADD COLUMN IF NOT EXISTS diseases JSONB DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS surgeries TEXT,
  ADD COLUMN IF NOT EXISTS ailments TEXT,
  ADD COLUMN IF NOT EXISTS injuries TEXT,
  ADD COLUMN IF NOT EXISTS sports JSONB DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS drugs JSONB DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS medications JSONB DEFAULT '[]'::JSONB,
  -- Emergency
  ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_relation TEXT,
  -- Extra
  ADD COLUMN IF NOT EXISTS medical_info_extra TEXT,
  ADD COLUMN IF NOT EXISTS personal_info_extra TEXT,
  -- HTK specific
  ADD COLUMN IF NOT EXISTS insurer TEXT,
  ADD COLUMN IF NOT EXISTS joined_at DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS referral_source TEXT,
  ADD COLUMN IF NOT EXISTS informed_consent_signed BOOLEAN DEFAULT FALSE;

-- Force PostgREST to reload schema cache (Supabase pattern)
NOTIFY pgrst, 'reload schema';
