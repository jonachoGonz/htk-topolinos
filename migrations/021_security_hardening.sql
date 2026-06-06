-- ============================================================
-- Migration 021: Security hardening (Supabase advisors)
-- ============================================================
-- Cierra los hallazgos del get_advisors(security) de Supabase:
--
-- 1. SECURITY DEFINER → INVOKER en 5 vistas (las RLS de cada usuario
--    aplicarán correctamente sin saltarse por escalada).
-- 2. RLS overly permissive en payments + subscriptions (WITH CHECK true)
--    → restringe a service_role server-side; cliente no debe escribir
--    a estas tablas directamente.
-- 3. Revoke EXECUTE de funciones admin a anon y authenticated. Solo
--    service_role puede invocarlas (las usan funciones serverless con
--    service key, no el cliente).
-- 4. SET search_path = public en todas las funciones (mitiga ataques
--    por shadowing en schemas creados por el atacante).
-- 5. Bucket público patient-photos: quita la policy de SELECT amplia
--    que permitía listar todos los archivos.
--
-- Apartado AUTH:
-- - Habilitar HaveIBeenPwned password protection NO se puede hacer
--   por SQL — el usuario debe activarlo en el dashboard:
--   Auth → Policies → Password Strength → "Leaked password protection"
-- ============================================================

-- ---------- 1. SECURITY DEFINER views → INVOKER ----------
-- Las vistas se redefinen sin SECURITY DEFINER. Las RLS de las tablas
-- subyacentes aplicarán según el usuario que consulta.
--
-- NOTA: Solo cambiamos el flag SECURITY si la vista existe. Si tu DB
-- no tiene alguna de estas vistas, el bloque la salta silenciosamente.

DO $$
DECLARE
  v_view text;
BEGIN
  FOR v_view IN SELECT unnest(ARRAY[
    'patient_attendance_stats',
    'admin_overview',
    'user_unread_count',
    'today_overview',
    'plan_distribution'
  ])
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.views
      WHERE table_schema = 'public' AND table_name = v_view
    ) THEN
      EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', v_view);
    END IF;
  END LOOP;
END $$;

-- ---------- 2. RLS payments + subscriptions ----------
-- Las policies actuales tienen WITH CHECK (true) que permiten que cualquiera
-- escriba. Las reemplazamos por una que solo permite a service_role.

-- payments
DROP POLICY IF EXISTS payments_insert_system ON public.payments;
DROP POLICY IF EXISTS payments_update_system ON public.payments;

CREATE POLICY payments_insert_service ON public.payments
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY payments_update_service ON public.payments
  FOR UPDATE TO service_role
  USING (true)
  WITH CHECK (true);

-- Mantener: clientes pueden LEER sus propios pagos (lo hace getPaymentHistory)
-- (Asumimos que ya existe una policy de SELECT por student_id = auth.uid().
-- Si no, descomenta:)
-- CREATE POLICY payments_select_owner ON public.payments
--   FOR SELECT TO authenticated
--   USING (student_id = auth.uid() OR public.is_user_admin() OR public.is_user_teacher());

-- subscriptions
DROP POLICY IF EXISTS subscriptions_insert_system ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_update_system ON public.subscriptions;

CREATE POLICY subscriptions_insert_service ON public.subscriptions
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY subscriptions_update_service ON public.subscriptions
  FOR UPDATE TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------- 3. Revoke EXECUTE en funciones admin ----------
-- Estas funciones SECURITY DEFINER ejecutan acciones privilegiadas. Solo
-- las llaman funciones serverless con service_role. Cualquiera con la anon
-- key NO debería poder ejecutarlas vía /rest/v1/rpc/...

REVOKE EXECUTE ON FUNCTION public.admin_assign_plan_to_student(uuid, uuid, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_set_patient_pause(uuid, boolean, text, timestamptz) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_upsert_patient(uuid, text, text, text, text) FROM anon, authenticated;

-- Funciones internas (triggers/helpers que NUNCA deberían exponerse vía REST):
REVOKE EXECUTE ON FUNCTION public.assign_default_plan_on_student_creation() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admin_on_signup() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_new_message() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_teacher_on_booking() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_profile_to_auth_metadata() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text, jsonb) FROM anon, authenticated;

-- bookings_affected_by_holiday: read-only sobre bookings + holidays. Si lo
-- usa el cliente para mostrar conflicts, dejar EXECUTE a authenticated; si
-- solo lo usa el server, revocar. Por defecto restrictivo:
REVOKE EXECUTE ON FUNCTION public.bookings_affected_by_holiday(uuid, date, date) FROM anon;

-- confirm_booking_attendance: lo invoca el profesor desde el cliente para
-- marcar asistencia atómicamente. Dejamos a authenticated, revocamos a anon.
REVOKE EXECUTE ON FUNCTION public.confirm_booking_attendance(uuid, boolean) FROM anon;

-- create_bulk_availability: profesor crea slots en bulk. Dejamos a authenticated.
REVOKE EXECUTE ON FUNCTION public.create_bulk_availability(uuid, integer[], time, time, integer, varchar, text) FROM anon;

-- is_user_admin / is_user_teacher: helpers de chequeo, leen JWT — son seguros
-- de exponer. No revocamos.

-- ---------- 4. SET search_path = public en todas las funciones ----------
-- Esto previene ataques donde el atacante crea un schema con nombre conocido
-- y mete versiones maliciosas de funciones que se invocan por nombre sin
-- qualificar.

ALTER FUNCTION public.create_notification(uuid, text, text, text, text, jsonb)        SET search_path = public, pg_temp;
ALTER FUNCTION public.bookings_affected_by_holiday(uuid, date, date)                  SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_admin_on_signup()                                        SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_auth_user()                                          SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at()                                             SET search_path = public, pg_temp;
ALTER FUNCTION public.assign_default_plan_on_student_creation()                       SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_teacher_on_booking()                                     SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_on_new_message()                                         SET search_path = public, pg_temp;
ALTER FUNCTION public.confirm_booking_attendance(uuid, boolean)                       SET search_path = public, pg_temp;
ALTER FUNCTION public.create_bulk_availability(uuid, integer[], time, time, integer, varchar, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_assign_plan_to_student(uuid, uuid, integer)               SET search_path = public, pg_temp;
ALTER FUNCTION public.is_user_admin()                                                 SET search_path = public, pg_temp;
ALTER FUNCTION public.is_user_teacher()                                               SET search_path = public, pg_temp;
ALTER FUNCTION public.compute_age(date)                                               SET search_path = public, pg_temp;
ALTER FUNCTION public.compute_bmi(numeric, numeric)                                   SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_upsert_patient(uuid, text, text, text, text)              SET search_path = public, pg_temp;

-- admin_set_patient_pause: notar que el signature varía si el doc tiene
-- timestamptz vs timestamp. Si esto falla, ajustar.
ALTER FUNCTION public.admin_set_patient_pause(uuid, boolean, text, timestamptz)       SET search_path = public, pg_temp;

-- sync_profile_to_auth_metadata: trigger function
ALTER FUNCTION public.sync_profile_to_auth_metadata()                                 SET search_path = public, pg_temp;

-- ---------- 5. Bucket patient-photos: quitar SELECT amplia ----------
-- La policy "Photos: read public bucket" permite listar TODO el bucket.
-- Para servir las imágenes basta con que el bucket sea público (URL signed-
-- free); no necesitamos policy de SELECT.

DROP POLICY IF EXISTS "Photos: read public bucket" ON storage.objects;

-- ---------- Audit ----------
-- Tras aplicar, vuelve a correr el advisor y deberías ver: 0 ERROR,
-- muchos menos WARN. El de "leaked_password_protection" hay que
-- activarlo manualmente en Auth → Password Strength.
