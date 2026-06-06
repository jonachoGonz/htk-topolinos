-- ============================================================
-- Migration 022: Revoke FROM PUBLIC + selective grants
-- ============================================================
-- La 021 hizo REVOKE FROM anon, authenticated pero el GRANT default que
-- crea CREATE FUNCTION va a PUBLIC. anon y authenticated heredan de PUBLIC,
-- por eso el advisor seguía marcando incluso después de la 021.
--
-- Patrón correcto: REVOKE ALL FROM PUBLIC, después GRANT solo a roles
-- específicos que necesitan ejecutar la función.
--
-- Resultado: 0 ERROR + 8 WARN (todos intencionales: funciones admin que
-- son llamadas desde el cliente con check interno de is_admin/is_teacher).
-- ============================================================

-- ===== Triggers internos / sin RPC público =====
REVOKE ALL ON FUNCTION public.handle_new_auth_user()                    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_admin_on_signup()                  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_teacher_on_booking()               FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_new_message()                   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_profile_to_auth_metadata()           FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assign_default_plan_on_student_creation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at()                       FROM PUBLIC, anon, authenticated;

-- ===== Funciones admin callable por authenticated (con check interno) =====
REVOKE ALL ON FUNCTION public.admin_assign_plan_to_student(uuid, uuid, integer)               FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_patient_pause(uuid, boolean, text, timestamptz)       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_upsert_patient(uuid, text, text, text, text)              FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_notification(uuid, text, text, text, text, jsonb)        FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_assign_plan_to_student(uuid, uuid, integer)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_patient_pause(uuid, boolean, text, timestamptz)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_patient(uuid, text, text, text, text)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text, jsonb)        TO authenticated;

-- ===== Funciones del profesor =====
REVOKE ALL ON FUNCTION public.confirm_booking_attendance(uuid, boolean)                                       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_bulk_availability(uuid, integer[], time, time, integer, varchar, text)   FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.bookings_affected_by_holiday(uuid, date, date)                                  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.confirm_booking_attendance(uuid, boolean)                                       TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_bulk_availability(uuid, integer[], time, time, integer, varchar, text)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.bookings_affected_by_holiday(uuid, date, date)                                  TO authenticated;

-- ===== Helpers internos para RLS policies =====
REVOKE ALL ON FUNCTION public.is_user_admin(uuid)    FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_user_teacher(uuid)  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_user_admin(uuid)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_teacher(uuid)  TO authenticated;

-- ===== Utilitarios =====
REVOKE ALL ON FUNCTION public.compute_age(date)             FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.compute_bmi(numeric, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.compute_age(date)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_bmi(numeric, numeric) TO authenticated;
