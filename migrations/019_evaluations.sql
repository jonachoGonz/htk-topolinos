-- ============================================================
-- Migration 019: Evaluations (body composition + strength)
-- ============================================================
-- Creates two history tables for periodic patient evaluations:
--   * body_evaluations  → measurements (weight, body fat %, muscle %, perimeters)
--   * strength_evaluations → max lifts on a closed exercise catalog
--
-- Authorship model:
--   * Only teachers / admins INSERT, UPDATE, DELETE.
--   * The patient (student) can SELECT their own rows.
--   * Teachers / admins can SELECT all rows.
-- ============================================================

-- ---------- body_evaluations ----------
CREATE TABLE IF NOT EXISTS public.body_evaluations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  professional_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  measured_at     date NOT NULL DEFAULT CURRENT_DATE,
  weight_kg       numeric(5,2),
  body_fat_pct    numeric(4,1),
  muscle_mass_pct numeric(4,1),
  bone_mass_pct   numeric(4,1),
  waist_cm        numeric(5,1),
  hip_cm          numeric(5,1),
  chest_cm        numeric(5,1),
  arm_cm          numeric(5,1),
  thigh_cm        numeric(5,1),
  calf_cm         numeric(5,1),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS body_eval_patient_date_idx
  ON public.body_evaluations (patient_id, measured_at DESC);

-- ---------- strength_evaluations ----------
-- Closed catalog of 8 exercises. Use lowercase snake_case for keys; UI
-- maps to display labels client-side.
CREATE TABLE IF NOT EXISTS public.strength_evaluations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  professional_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  measured_at     date NOT NULL DEFAULT CURRENT_DATE,
  exercise        text NOT NULL CHECK (exercise IN (
    'sentadilla', 'peso_muerto', 'press_banca', 'press_militar',
    'dominada', 'remo', 'hip_thrust', 'peso_muerto_rumano'
  )),
  weight_kg       numeric(5,2) NOT NULL,
  reps            integer NOT NULL DEFAULT 1 CHECK (reps > 0),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS strength_eval_patient_exercise_date_idx
  ON public.strength_evaluations (patient_id, exercise, measured_at DESC);

-- ---------- RLS ----------
ALTER TABLE public.body_evaluations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strength_evaluations ENABLE ROW LEVEL SECURITY;

-- Helper predicates use auth.jwt() to avoid the recursion trap from migration 017.
DROP POLICY IF EXISTS body_eval_select       ON public.body_evaluations;
DROP POLICY IF EXISTS body_eval_write        ON public.body_evaluations;
DROP POLICY IF EXISTS strength_eval_select   ON public.strength_evaluations;
DROP POLICY IF EXISTS strength_eval_write    ON public.strength_evaluations;

-- SELECT: owner OR teacher OR admin
CREATE POLICY body_eval_select ON public.body_evaluations
  FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid()
    OR public.is_user_teacher()
    OR public.is_user_admin()
  );

CREATE POLICY strength_eval_select ON public.strength_evaluations
  FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid()
    OR public.is_user_teacher()
    OR public.is_user_admin()
  );

-- INSERT / UPDATE / DELETE: teacher OR admin only
CREATE POLICY body_eval_write ON public.body_evaluations
  FOR ALL TO authenticated
  USING (public.is_user_teacher() OR public.is_user_admin())
  WITH CHECK (public.is_user_teacher() OR public.is_user_admin());

CREATE POLICY strength_eval_write ON public.strength_evaluations
  FOR ALL TO authenticated
  USING (public.is_user_teacher() OR public.is_user_admin())
  WITH CHECK (public.is_user_teacher() OR public.is_user_admin());

-- ---------- Audit verification ----------
-- Run after applying:
--   SELECT 'body_evaluations',     COUNT(*) FROM pg_tables WHERE tablename = 'body_evaluations'
--   UNION ALL
--   SELECT 'strength_evaluations', COUNT(*) FROM pg_tables WHERE tablename = 'strength_evaluations';
