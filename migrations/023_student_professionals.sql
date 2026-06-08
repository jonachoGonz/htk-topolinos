-- ============================================================
-- Migration 023: Tabla M2M alumno ↔ profesionales asignados
-- ============================================================
-- Un alumno puede tener N profesionales asignados (kinesiólogo +
-- nutricionista + terapeuta, por ej.). Un profesional puede tener N
-- alumnos. Solo admin asigna/quita; profesional y alumno solo leen.
--
-- - PatientsList del profesor (no admin) filtra al listado a sus
--   asignados consultando esta tabla.
-- - Sección "Profesionales" dentro de PatientDetailModal (admin) lista
--   los asignados y permite agregar/quitar.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.student_professionals (
  student_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  professional_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  professional_type text,
  assigned_at       timestamptz NOT NULL DEFAULT now(),
  assigned_by       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes             text,
  PRIMARY KEY (student_id, professional_id)
);

CREATE INDEX IF NOT EXISTS student_pros_by_professional
  ON public.student_professionals (professional_id);
CREATE INDEX IF NOT EXISTS student_pros_by_student
  ON public.student_professionals (student_id);

ALTER TABLE public.student_professionals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_pros_select       ON public.student_professionals;
DROP POLICY IF EXISTS student_pros_admin_write  ON public.student_professionals;

CREATE POLICY student_pros_select ON public.student_professionals
  FOR SELECT TO authenticated
  USING (
    public.is_user_admin(auth.uid())
    OR public.is_user_teacher(auth.uid())
    OR student_id = auth.uid()
  );

CREATE POLICY student_pros_admin_write ON public.student_professionals
  FOR ALL TO authenticated
  USING (public.is_user_admin(auth.uid()))
  WITH CHECK (public.is_user_admin(auth.uid()));
