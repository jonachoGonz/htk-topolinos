-- ============================================================
-- Migration 024: Profile reorganization + extended evaluations
-- ============================================================
-- Removes from `profiles` the measurement/activity/objective columns
-- that were duplicated with `body_evaluations` (the periodic history
-- table from migration 019) and adds the static fields found when
-- cross-referencing the paper enrollment form ("Formulario inscripción
-- HTK.docx", being retired — all registration now happens in-app).
--
-- Extends `body_evaluations` with the fields that DO change at every
-- professional evaluation: vitals, skinfolds, habits, pain assessment,
-- objectives. See docs/superpowers/specs/2026-06-20-perfil-evaluacion-mensual-design.md
-- ============================================================

-- ---------- profiles: add static fields ----------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS socio_number text,
  ADD COLUMN IF NOT EXISTS social_media_handle text,
  ADD COLUMN IF NOT EXISTS health_center text,
  ADD COLUMN IF NOT EXISTS social_media_consent boolean NOT NULL DEFAULT false;

-- Verified before applying (2026-06-20): profiles WHERE role='student' had 4 test rows
-- and body_evaluations had 0 rows in the live project (lvxktbecpvmbcuucjxpp) — no
-- production data at risk from the DROP COLUMN block below. This is the first migration
-- in this repo's history to drop a column; there is no down-migration, this is not
-- reversible without restoring from a backup.
-- ---------- profiles: drop fields duplicated with body_evaluations ----------
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS height_cm,
  DROP COLUMN IF EXISTS weight_kg,
  DROP COLUMN IF EXISTS body_fat_pct,
  DROP COLUMN IF EXISTS muscle_mass_pct,
  DROP COLUMN IF EXISTS bone_mass_pct,
  DROP COLUMN IF EXISTS waist_cm,
  DROP COLUMN IF EXISTS hip_cm,
  DROP COLUMN IF EXISTS chest_cm,
  DROP COLUMN IF EXISTS arm_cm,
  DROP COLUMN IF EXISTS thigh_cm,
  DROP COLUMN IF EXISTS calf_cm,
  DROP COLUMN IF EXISTS activity_level,
  DROP COLUMN IF EXISTS objective;

-- ---------- body_evaluations: scalar additions ----------
ALTER TABLE public.body_evaluations
  ADD COLUMN IF NOT EXISTS height_cm numeric(5,2),
  ADD COLUMN IF NOT EXISTS bone_mass_pct numeric(4,1),
  ADD COLUMN IF NOT EXISTS neck_cm numeric(5,1),
  ADD COLUMN IF NOT EXISTS shoulders_cm numeric(5,1),
  ADD COLUMN IF NOT EXISTS resting_heart_rate integer,
  ADD COLUMN IF NOT EXISTS blood_pressure_systolic integer,
  ADD COLUMN IF NOT EXISTS blood_pressure_diastolic integer;

-- ---------- body_evaluations: JSONB groups ----------
ALTER TABLE public.body_evaluations
  ADD COLUMN IF NOT EXISTS skinfolds jsonb,
  ADD COLUMN IF NOT EXISTS habits jsonb,
  ADD COLUMN IF NOT EXISTS max_hr_zones jsonb,
  ADD COLUMN IF NOT EXISTS pain_assessment jsonb,
  ADD COLUMN IF NOT EXISTS objectives jsonb;

-- ---------- body_evaluations: free text ----------
ALTER TABLE public.body_evaluations
  ADD COLUMN IF NOT EXISTS rom_notes text,
  ADD COLUMN IF NOT EXISTS strength_notes text,
  ADD COLUMN IF NOT EXISTS findings text;

-- No RLS changes needed: existing policies on both tables are
-- column-agnostic (USING clauses reference patient_id / is_user_admin()),
-- so they automatically cover the new columns.

-- ---------- Audit verification ----------
-- Run after applying:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'profiles'
--     AND column_name IN ('socio_number','social_media_handle','health_center','social_media_consent');
--   -- expect 4 rows
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'profiles'
--     AND column_name IN ('height_cm','weight_kg','activity_level','objective');
--   -- expect 0 rows
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'body_evaluations'
--     AND column_name IN ('height_cm','bone_mass_pct','neck_cm','shoulders_cm',
--       'resting_heart_rate','blood_pressure_systolic','blood_pressure_diastolic',
--       'skinfolds','habits','max_hr_zones','pain_assessment','objectives',
--       'rom_notes','strength_notes','findings');
--   -- expect 15 rows
