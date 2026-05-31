-- Migration 007: Patient Management
-- Date: 2026-05-30
-- Purpose: Comprehensive patient data + private notes + pause + attendance tracking

-- ===================================================================
-- 1. EXPAND profiles with patient/personal fields
-- ===================================================================
ALTER TABLE profiles
  -- Identity
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS rut_dni TEXT,
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS gender TEXT, -- M / F / X
  ADD COLUMN IF NOT EXISTS marital_status TEXT,
    -- soltero | casado | conviviente | divorciado | viudo | otro
  ADD COLUMN IF NOT EXISTS has_children BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS num_children INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS profession TEXT,
  ADD COLUMN IF NOT EXISTS occupation TEXT, -- labor actual
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  -- Body composition
  ADD COLUMN IF NOT EXISTS height_cm NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS body_fat_pct NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS muscle_mass_pct NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS bone_mass_pct NUMERIC(4,1),
  -- Activity / goals
  ADD COLUMN IF NOT EXISTS activity_level TEXT,
    -- sedentario | ligero | moderado | activo | muy_activo | atleta
  ADD COLUMN IF NOT EXISTS objective TEXT, -- free text
  ADD COLUMN IF NOT EXISTS handedness TEXT, -- diestro | zurdo | ambidiestro
  -- Medical
  ADD COLUMN IF NOT EXISTS blood_type TEXT, -- A+, A-, B+, B-, AB+, AB-, O+, O-
  ADD COLUMN IF NOT EXISTS allergies TEXT,
  ADD COLUMN IF NOT EXISTS diseases JSONB DEFAULT '[]'::JSONB,
    -- array of disease keys: ['diabetes_t1','diabetes_t2','asma','epilepsia',...]
  ADD COLUMN IF NOT EXISTS surgeries TEXT,
  ADD COLUMN IF NOT EXISTS ailments TEXT,  -- dolencias
  ADD COLUMN IF NOT EXISTS injuries TEXT,  -- lesiones
  ADD COLUMN IF NOT EXISTS sports JSONB DEFAULT '[]'::JSONB,
    -- [{name, since, frequency_per_week}]
  ADD COLUMN IF NOT EXISTS drugs JSONB DEFAULT '[]'::JSONB,
    -- [{name, frequency, since}]
  ADD COLUMN IF NOT EXISTS medications JSONB DEFAULT '[]'::JSONB,
    -- [{name, dose, frequency, since}]
  -- Emergency
  ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_relation TEXT,
  -- Extra
  ADD COLUMN IF NOT EXISTS medical_info_extra TEXT,
  ADD COLUMN IF NOT EXISTS personal_info_extra TEXT,
  -- HTK specific / admin extras
  ADD COLUMN IF NOT EXISTS insurer TEXT, -- Fonasa / Isapre / Particular / Otro
  ADD COLUMN IF NOT EXISTS joined_at DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS referral_source TEXT, -- cómo nos conoció
  ADD COLUMN IF NOT EXISTS informed_consent_signed BOOLEAN DEFAULT FALSE,
  -- Pause state
  ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paused_by UUID, -- admin who paused
  ADD COLUMN IF NOT EXISTS pause_reason TEXT,
  ADD COLUMN IF NOT EXISTS pause_resume_at TIMESTAMPTZ;

-- Computed-on-read helper: age (years)
CREATE OR REPLACE FUNCTION public.compute_age(p_birth_date DATE)
RETURNS INTEGER AS $$
BEGIN
  IF p_birth_date IS NULL THEN RETURN NULL; END IF;
  RETURN DATE_PART('year', AGE(CURRENT_DATE, p_birth_date))::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Computed-on-read helper: BMI
CREATE OR REPLACE FUNCTION public.compute_bmi(p_height_cm NUMERIC, p_weight_kg NUMERIC)
RETURNS NUMERIC AS $$
BEGIN
  IF p_height_cm IS NULL OR p_weight_kg IS NULL OR p_height_cm = 0
    THEN RETURN NULL;
  END IF;
  RETURN ROUND(p_weight_kg / ((p_height_cm/100.0) * (p_height_cm/100.0)), 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ===================================================================
-- 2. patient_notes table — private notes (teacher/admin only)
-- ===================================================================
CREATE TABLE IF NOT EXISTS patient_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_notes_patient ON patient_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_notes_created ON patient_notes(created_at DESC);

ALTER TABLE patient_notes ENABLE ROW LEVEL SECURITY;

-- Teacher/admin can read all notes
DROP POLICY IF EXISTS "Teachers/admin can read all notes" ON patient_notes;
CREATE POLICY "Teachers/admin can read all notes"
  ON patient_notes FOR SELECT
  USING (public.is_user_teacher() OR public.is_user_admin());

-- Teacher/admin can insert
DROP POLICY IF EXISTS "Teachers/admin can insert notes" ON patient_notes;
CREATE POLICY "Teachers/admin can insert notes"
  ON patient_notes FOR INSERT
  WITH CHECK (public.is_user_teacher() OR public.is_user_admin());

-- Author can update/delete own; admin can update/delete any
DROP POLICY IF EXISTS "Author or admin can update notes" ON patient_notes;
CREATE POLICY "Author or admin can update notes"
  ON patient_notes FOR UPDATE
  USING (author_id = auth.uid() OR public.is_user_admin());

DROP POLICY IF EXISTS "Author or admin can delete notes" ON patient_notes;
CREATE POLICY "Author or admin can delete notes"
  ON patient_notes FOR DELETE
  USING (author_id = auth.uid() OR public.is_user_admin());

-- Patients explicitly CANNOT read notes (no policy granted for them)

-- ===================================================================
-- 3. patient_attendance_stats VIEW (derived from bookings)
-- ===================================================================
CREATE OR REPLACE VIEW patient_attendance_stats AS
SELECT
  p.id AS patient_id,
  p.full_name,
  COUNT(b.id) FILTER (WHERE b.status = 'confirmed') AS confirmed_count,
  COUNT(b.id) FILTER (WHERE b.attended = TRUE) AS attended_count,
  COUNT(b.id) FILTER (WHERE b.attended = FALSE AND b.attendance_confirmed_at IS NOT NULL) AS absent_count,
  CASE
    WHEN COUNT(b.id) FILTER (WHERE b.attendance_confirmed_at IS NOT NULL) > 0
    THEN ROUND(
      100.0 * COUNT(b.id) FILTER (WHERE b.attended = TRUE)::NUMERIC /
      COUNT(b.id) FILTER (WHERE b.attendance_confirmed_at IS NOT NULL)::NUMERIC,
      1
    )
    ELSE NULL
  END AS attendance_rate_pct,
  MAX(b.booking_date::TIMESTAMP + b.start_time)
    FILTER (WHERE b.attended = TRUE) AS last_attended_session,
  MAX(b.booking_date::TIMESTAMP + b.start_time)
    FILTER (WHERE b.status = 'confirmed') AS last_scheduled_session
FROM profiles p
LEFT JOIN bookings b ON b.student_id = p.id
WHERE p.role = 'student'
GROUP BY p.id, p.full_name;

GRANT SELECT ON patient_attendance_stats TO authenticated;

-- ===================================================================
-- 4. RPC: pause / resume a patient
-- ===================================================================
CREATE OR REPLACE FUNCTION public.admin_set_patient_pause(
  p_patient_id UUID,
  p_paused BOOLEAN,
  p_reason TEXT DEFAULT NULL,
  p_resume_at TIMESTAMPTZ DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_caller UUID := auth.uid();
BEGIN
  IF NOT public.is_user_admin(v_caller) THEN
    RETURN json_build_object('success', false, 'error', 'Solo admin puede pausar/reanudar');
  END IF;

  IF p_paused THEN
    UPDATE profiles
    SET is_paused = TRUE,
        paused_at = NOW(),
        paused_by = v_caller,
        pause_reason = p_reason,
        pause_resume_at = p_resume_at
    WHERE id = p_patient_id;

    -- Pause the active plan
    UPDATE plans SET is_active = FALSE
    WHERE student_id = p_patient_id AND is_active = TRUE;
  ELSE
    UPDATE profiles
    SET is_paused = FALSE,
        paused_at = NULL,
        paused_by = NULL,
        pause_reason = NULL,
        pause_resume_at = NULL
    WHERE id = p_patient_id;

    -- Reactivate the most recent (now inactive) plan if it hasn't expired
    UPDATE plans
    SET is_active = TRUE
    WHERE id = (
      SELECT id FROM plans
      WHERE student_id = p_patient_id
        AND expiry_date >= CURRENT_DATE
      ORDER BY created_at DESC
      LIMIT 1
    );
  END IF;

  RETURN json_build_object('success', true, 'paused', p_paused);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- 5. RPC: admin create patient
-- ===================================================================
-- Note: full signup with auth.users requires service role. The admin UI
-- creates a profile row, but the auth.users row must be created by signup
-- (or invite). For MVP we expose this RPC so admin can pre-create profile
-- and then student signs up with the same email and the profile auto-links.
CREATE OR REPLACE FUNCTION public.admin_upsert_patient(
  p_id UUID,
  p_full_name TEXT,
  p_email TEXT DEFAULT NULL,
  p_rut_dni TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
) RETURNS JSON AS $$
BEGIN
  IF NOT public.is_user_admin() THEN
    RETURN json_build_object('success', false, 'error', 'Solo admin');
  END IF;

  INSERT INTO profiles (id, full_name, email, rut_dni, phone, role)
  VALUES (p_id, p_full_name, p_email, p_rut_dni, p_phone, 'student')
  ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        email = COALESCE(EXCLUDED.email, profiles.email),
        rut_dni = COALESCE(EXCLUDED.rut_dni, profiles.rut_dni),
        phone = COALESCE(EXCLUDED.phone, profiles.phone),
        updated_at = NOW();

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
