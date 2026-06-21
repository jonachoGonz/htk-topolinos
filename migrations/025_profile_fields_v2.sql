-- ============================================================
-- Migration 025: Profile fields v2 (post-review feedback)
-- ============================================================
-- Continuación de la migración 024 tras feedback de revisión del usuario
-- sobre el worktree. Ver docs/superpowers/specs/2026-06-20-perfil-evaluacion-mensual-design.md
-- (sección "Addendum 2026-06-21") para el detalle completo.
-- ============================================================

-- ---------- profiles: dirección separada en 3 campos ----------
-- `address` sigue siendo la calle (sin cambio de nombre ni de tipo).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address_number text,
  ADD COLUMN IF NOT EXISTS comuna text;

-- ---------- profiles: "otra" enfermedad como texto libre ----------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS diseases_other text;

-- ---------- profiles: contacto de emergencia → array ----------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS emergency_contacts jsonb;

-- Backfill: la única fila real con emergency_contact_name no vacío pasa a
-- emergency_contacts antes de eliminar las columnas viejas. Verificado en vivo
-- (2026-06-21): 1 de 6 filas en profiles cumple la condición.
UPDATE public.profiles
SET emergency_contacts = jsonb_build_array(
  jsonb_build_object(
    'name', emergency_contact_name,
    'phone', emergency_contact_phone,
    'relation', emergency_contact_relation
  )
)
WHERE emergency_contact_name IS NOT NULL AND emergency_contact_name <> '';

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS emergency_contact_name,
  DROP COLUMN IF EXISTS emergency_contact_phone,
  DROP COLUMN IF EXISTS emergency_contact_relation;

-- ---------- socio_number: secuencia + función autogeneradora ----------
-- Solo se usa server-side (admin-create-patient.ts) para role='student'.
-- Formato: HTKTOP-001, HTKTOP-002, ... Los alumnos migrados del centro
-- anterior usan el prefijo HTK- — esa reasignación puntual se hace
-- manualmente más adelante, fuera de esta función.
CREATE SEQUENCE IF NOT EXISTS public.socio_number_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.next_socio_number()
RETURNS text
LANGUAGE sql
AS $$
  SELECT 'HTKTOP-' || lpad(nextval('public.socio_number_seq')::text, 3, '0');
$$;

GRANT EXECUTE ON FUNCTION public.next_socio_number() TO service_role;

-- ---------- Audit verification ----------
-- Run after applying:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'profiles'
--     AND column_name IN ('address_number','comuna','diseases_other','emergency_contacts');
--   -- expect 4 rows
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'profiles'
--     AND column_name IN ('emergency_contact_name','emergency_contact_phone','emergency_contact_relation');
--   -- expect 0 rows
--
--   SELECT emergency_contacts FROM profiles WHERE emergency_contacts IS NOT NULL;
--   -- expect exactly 1 row, with the migrated contact's name/phone/relation
--
--   SELECT public.next_socio_number();
--   -- expect 'HTKTOP-001' on first call in a fresh sequence (or the next
--   -- number in sequence if called before)
