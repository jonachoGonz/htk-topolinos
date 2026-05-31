-- Migration 010: Payments + Notifications + Onboarding + Reagendar
-- Date: 2026-05-30
-- Purpose: Foundation for modules A (payments), B (notifications),
--          F (onboarding wizard), H (reagendar flow)

-- ===================================================================
-- 1. ONBOARDING tracking on profiles
-- ===================================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_steps JSONB DEFAULT '{}'::JSONB;
  -- {profile: true, parq: true, plan: false, ...}

-- ===================================================================
-- 2. NOTIFICATIONS table (in-app)
-- ===================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
    -- 'booking_reminder', 'plan_expiry', 'plan_purchased', 'plan_assigned',
    -- 'booking_cancelled', 'class_reagendar', 'patient_paused',
    -- 'new_signup', 'booking_attended', 'admin_message'
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,                -- optional deep-link inside the app
  metadata JSONB DEFAULT '{}'::JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  email_sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created
  ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notifications" ON notifications;
CREATE POLICY "Users read own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own notifications" ON notifications;
CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone authenticated can insert notifications" ON notifications;
CREATE POLICY "Anyone authenticated can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
  -- Anyone can create notifications for others (used by triggers / RPCs)
  -- In production hardenable to admin/teacher-only via is_user_admin/is_user_teacher

-- ===================================================================
-- 3. PAYMENT enhancements
-- ===================================================================
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS receipt_url TEXT,
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_payments_session
  ON payments(stripe_session_id);

-- ===================================================================
-- 4. RPC: create notification (helper used by app code / triggers)
-- ===================================================================
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_link TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO notifications(user_id, type, title, body, link, metadata)
  VALUES (p_user_id, p_type, p_title, p_body, p_link, p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.create_notification TO authenticated;

-- ===================================================================
-- 5. RPC: bookings affected by a holiday (used for reagendar flow H)
-- ===================================================================
CREATE OR REPLACE FUNCTION public.bookings_affected_by_holiday(
  p_professional_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  booking_id UUID,
  student_id UUID,
  student_name TEXT,
  booking_date DATE,
  start_time TIME,
  end_time TIME
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id AS booking_id,
    b.student_id,
    s.full_name AS student_name,
    b.booking_date,
    b.start_time,
    b.end_time
  FROM bookings b
  LEFT JOIN profiles s ON s.id = b.student_id
  WHERE b.professional_id = p_professional_id
    AND b.status = 'confirmed'
    AND b.booking_date BETWEEN p_start_date AND p_end_date
  ORDER BY b.booking_date, b.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ===================================================================
-- 6. TRIGGER: notify teacher when student books a class
-- ===================================================================
CREATE OR REPLACE FUNCTION public.notify_teacher_on_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_student_name TEXT;
BEGIN
  IF NEW.status <> 'confirmed' THEN
    RETURN NEW;
  END IF;
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
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_teacher_on_booking ON bookings;
CREATE TRIGGER trg_notify_teacher_on_booking
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_teacher_on_booking();

-- ===================================================================
-- 7. TRIGGER: notify admin when new student signs up
-- ===================================================================
CREATE OR REPLACE FUNCTION public.notify_admin_on_signup()
RETURNS TRIGGER AS $$
DECLARE
  v_admin RECORD;
BEGIN
  IF NEW.role <> 'student' THEN RETURN NEW; END IF;
  FOR v_admin IN SELECT id FROM profiles WHERE is_admin = TRUE LOOP
    PERFORM public.create_notification(
      v_admin.id,
      'new_signup',
      'Nuevo alumno registrado',
      COALESCE(NEW.full_name, 'Un alumno') || ' acaba de registrarse',
      '/dashboard',
      jsonb_build_object('student_id', NEW.id)
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_admin_on_signup ON profiles;
CREATE TRIGGER trg_notify_admin_on_signup
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_on_signup();

-- ===================================================================
-- 8. VIEW: unread notification counter per user
-- ===================================================================
CREATE OR REPLACE VIEW user_unread_count AS
SELECT user_id, COUNT(*) AS unread_count
FROM notifications WHERE read_at IS NULL
GROUP BY user_id;
GRANT SELECT ON user_unread_count TO authenticated;
