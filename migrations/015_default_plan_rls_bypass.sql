-- Migration 015: Make default-plan-on-signup trigger truly bypass RLS
-- Date: 2026-05-31
-- During E2E test, the trigger silently swallowed errors (since 013 wraps in
-- EXCEPTION) and the new student's default plan wasn't created. Root cause:
-- the INSERT into `plans` runs in the context of the signup, and RLS on
-- `plans` blocks the write.
--
-- Fix: explicitly SET LOCAL row_security = off inside the SECURITY DEFINER
-- function, OR add an "anyone can insert plans via trigger" policy. We use
-- the first approach because it's more surgical.

CREATE OR REPLACE FUNCTION public.assign_default_plan_on_student_creation()
RETURNS TRIGGER AS $$
DECLARE
  v_default_template RECORD;
BEGIN
  -- Inside SECURITY DEFINER. Disable RLS for this function execution.
  -- (postgres role bypasses RLS but we set this explicitly for safety.)
  SET LOCAL row_security = off;

  BEGIN
    IF NEW.role <> 'student' THEN RETURN NEW; END IF;

    IF EXISTS (SELECT 1 FROM plans WHERE student_id = NEW.id AND is_active = TRUE) THEN
      RETURN NEW;
    END IF;

    SELECT * INTO v_default_template
    FROM plan_templates
    WHERE is_default = TRUE AND is_active = TRUE
    LIMIT 1;

    IF v_default_template.id IS NOT NULL THEN
      INSERT INTO plans (
        student_id, name, total_sessions, remaining_sessions,
        monthly_class_count, expiry_date, is_active
      ) VALUES (
        NEW.id, v_default_template.name,
        v_default_template.monthly_classes,
        v_default_template.monthly_classes,
        v_default_template.monthly_classes,
        NOW() + INTERVAL '1 month', TRUE
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'assign_default_plan error: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Same pattern for notify_admin_on_signup (notification insert may also be blocked)
CREATE OR REPLACE FUNCTION public.notify_admin_on_signup()
RETURNS TRIGGER AS $$
DECLARE
  v_admin RECORD;
BEGIN
  SET LOCAL row_security = off;
  BEGIN
    IF NEW.role <> 'student' THEN RETURN NEW; END IF;
    FOR v_admin IN SELECT id FROM profiles WHERE is_admin = TRUE LOOP
      BEGIN
        PERFORM public.create_notification(
          v_admin.id,
          'new_signup',
          'Nuevo alumno registrado',
          COALESCE(NEW.full_name, 'Un alumno') || ' acaba de registrarse',
          '/dashboard',
          jsonb_build_object('student_id', NEW.id)
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'notify_admin (individual) error: %', SQLERRM;
      END;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_admin_on_signup error: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- And for notify_teacher_on_booking
CREATE OR REPLACE FUNCTION public.notify_teacher_on_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_student_name TEXT;
BEGIN
  SET LOCAL row_security = off;
  BEGIN
    IF NEW.status <> 'confirmed' THEN RETURN NEW; END IF;
    SELECT full_name INTO v_student_name FROM profiles WHERE id = NEW.student_id;
    PERFORM public.create_notification(
      NEW.professional_id,
      'new_booking',
      'Nueva clase agendada',
      COALESCE(v_student_name, 'Un alumno') || ' agendó el ' ||
        TO_CHAR(NEW.booking_date, 'DD/MM') || ' a las ' || TO_CHAR(NEW.start_time, 'HH24:MI'),
      '/dashboard',
      jsonb_build_object('booking_id', NEW.id, 'student_id', NEW.student_id)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_teacher_on_booking error: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- And for notify_on_new_message
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_name TEXT;
BEGIN
  SET LOCAL row_security = off;
  BEGIN
    SELECT full_name INTO v_sender_name FROM profiles WHERE id = NEW.sender_id;
    PERFORM public.create_notification(
      NEW.recipient_id,
      'admin_message',
      'Nuevo mensaje de ' || COALESCE(v_sender_name, 'un usuario'),
      LEFT(NEW.body, 80),
      '/dashboard?tab=messages',
      jsonb_build_object('sender_id', NEW.sender_id, 'message_id', NEW.id)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_on_new_message error: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';
