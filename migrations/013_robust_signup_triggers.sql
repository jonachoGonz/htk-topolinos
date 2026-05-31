-- Migration 013: Make signup trigger chain robust
-- Date: 2026-05-31
-- Problem: auth.users INSERT fires handle_new_auth_user → inserts profile →
--          fires trg_notify_admin_on_signup + trg_assign_default_plan.
--          If ANY of these fails (RLS, missing column, etc), the entire signup
--          rolls back with cryptic 500 "unexpected_failure".
-- Fix: wrap each trigger function body in EXCEPTION block so errors are logged
--      but never block the auth signup.

-- ===================================================================
-- 1. handle_new_auth_user — never block signup
-- ===================================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, full_name, role, email)
    VALUES (
      NEW.id,
      COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
      ),
      COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
      NEW.email
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_auth_user error: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- 2. assign_default_plan_on_student_creation — never block profile insert
-- ===================================================================
CREATE OR REPLACE FUNCTION public.assign_default_plan_on_student_creation()
RETURNS TRIGGER AS $$
DECLARE
  v_default_template RECORD;
BEGIN
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

-- ===================================================================
-- 3. notify_admin_on_signup — never block profile insert
-- ===================================================================
CREATE OR REPLACE FUNCTION public.notify_admin_on_signup()
RETURNS TRIGGER AS $$
DECLARE
  v_admin RECORD;
BEGIN
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

-- ===================================================================
-- 4. notify_teacher_on_booking — never block bookings
-- ===================================================================
CREATE OR REPLACE FUNCTION public.notify_teacher_on_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_student_name TEXT;
BEGIN
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

-- ===================================================================
-- 5. notify_on_new_message — never block messages
-- ===================================================================
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_name TEXT;
BEGIN
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
