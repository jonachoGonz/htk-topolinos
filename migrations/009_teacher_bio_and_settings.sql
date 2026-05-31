-- Migration 009: Teacher bio fields + App Settings singleton
-- Date: 2026-05-30
-- Purpose: Modules C (Teacher Profile) + E (Global Settings)
--          D (Dashboards) needs no schema — uses existing data.

-- ===================================================================
-- 1. Teacher-specific fields on profiles
-- ===================================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS years_experience INTEGER,
  ADD COLUMN IF NOT EXISTS education TEXT,
  ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]'::JSONB,
    -- [{title, issuer, year, url}]
  ADD COLUMN IF NOT EXISTS specialties JSONB DEFAULT '[]'::JSONB,
    -- ["kinesiologia deportiva", "rehabilitacion", "nutricion clinica", ...]
  ADD COLUMN IF NOT EXISTS languages JSONB DEFAULT '[]'::JSONB,
    -- ["es", "en"]
  ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::JSONB,
    -- {instagram, linkedin, web}
  ADD COLUMN IF NOT EXISTS show_in_directory BOOLEAN DEFAULT TRUE;
    -- whether to list this teacher in the student's selector

-- ===================================================================
-- 2. App Settings — singleton row table
-- ===================================================================
CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- enforce singleton
  -- Center info
  center_name TEXT DEFAULT 'HTK Center',
  center_address TEXT,
  center_phone TEXT,
  center_email TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#00d4ff',
  -- Policies
  cancellation_hours INTEGER DEFAULT 12,
  default_class_capacity INTEGER DEFAULT 5,
  default_plan_duration_months INTEGER DEFAULT 1,
  -- Operating hours (JSONB { mon: [open,close], tue: [...], ... })
  operating_hours JSONB DEFAULT '{}'::JSONB,
  -- Messaging
  welcome_message_student TEXT,
  welcome_message_teacher TEXT,
  email_reminder_hours_before INTEGER DEFAULT 24,
  -- Stripe (only metadata, secret stays in env)
  stripe_publishable_key TEXT,
  stripe_account_country TEXT DEFAULT 'CL',
  default_currency TEXT DEFAULT 'CLP',
  -- Extra
  extras JSONB DEFAULT '{}'::JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID
);

-- Seed default row if not exists
INSERT INTO app_settings (id, center_name)
VALUES (1, 'HTK Center')
ON CONFLICT (id) DO NOTHING;

-- ===================================================================
-- 3. RLS for app_settings
-- ===================================================================
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can READ (the front-end needs the config)
DROP POLICY IF EXISTS "Anyone can read settings" ON app_settings;
CREATE POLICY "Anyone can read settings"
  ON app_settings FOR SELECT
  USING (TRUE);

-- Only admin can UPDATE
DROP POLICY IF EXISTS "Admin can update settings" ON app_settings;
CREATE POLICY "Admin can update settings"
  ON app_settings FOR UPDATE
  USING (public.is_user_admin());

-- ===================================================================
-- 4. View: today_overview (for teacher dashboard)
-- ===================================================================
CREATE OR REPLACE VIEW today_overview AS
SELECT
  p.id AS professional_id,
  COUNT(b.id) FILTER (WHERE b.booking_date = CURRENT_DATE
    AND b.status = 'confirmed') AS today_count,
  COUNT(b.id) FILTER (WHERE b.booking_date = CURRENT_DATE
    AND b.status = 'confirmed' AND b.attended IS NULL) AS today_pending_attendance,
  COUNT(b.id) FILTER (WHERE b.booking_date BETWEEN CURRENT_DATE
    AND CURRENT_DATE + INTERVAL '7 days'
    AND b.status = 'confirmed') AS week_count,
  COUNT(DISTINCT b.student_id) FILTER (WHERE b.booking_date >= CURRENT_DATE - INTERVAL '30 days')
    AS active_students_30d
FROM profiles p
LEFT JOIN bookings b ON b.professional_id = p.id
WHERE p.role = 'teacher'
GROUP BY p.id;

GRANT SELECT ON today_overview TO authenticated;

-- ===================================================================
-- 5. View: admin_overview (revenue, students, occupancy)
-- ===================================================================
CREATE OR REPLACE VIEW admin_overview AS
SELECT
  (SELECT COUNT(*) FROM profiles WHERE role = 'student') AS total_students,
  (SELECT COUNT(*) FROM profiles WHERE role = 'student' AND is_paused = TRUE) AS paused_students,
  (SELECT COUNT(*) FROM profiles WHERE role = 'student' AND is_paused = FALSE) AS active_students,
  (SELECT COUNT(*) FROM profiles WHERE role = 'teacher') AS total_teachers,
  (SELECT COUNT(*) FROM plans WHERE is_active = TRUE) AS active_plans,
  (SELECT COUNT(*) FROM bookings
    WHERE booking_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
    AND status = 'confirmed') AS bookings_next_7_days,
  (SELECT COUNT(*) FROM bookings
    WHERE booking_date >= date_trunc('month', CURRENT_DATE)
    AND status = 'confirmed') AS bookings_this_month,
  (SELECT COUNT(*) FROM bookings
    WHERE booking_date >= date_trunc('month', CURRENT_DATE)
    AND attended = TRUE) AS attended_this_month,
  (SELECT COALESCE(SUM(amount), 0) FROM payments
    WHERE created_at >= date_trunc('month', CURRENT_DATE)
    AND status = 'succeeded') AS revenue_this_month;

GRANT SELECT ON admin_overview TO authenticated;

-- ===================================================================
-- 6. View: plan_distribution (which plans are most popular)
-- ===================================================================
CREATE OR REPLACE VIEW plan_distribution AS
SELECT
  pt.id AS template_id,
  pt.name AS template_name,
  pt.monthly_classes,
  COUNT(p.id) AS active_subscriptions,
  COALESCE(SUM(p.remaining_sessions), 0) AS total_remaining_sessions
FROM plan_templates pt
LEFT JOIN plans p ON p.name = pt.name AND p.is_active = TRUE
WHERE pt.is_active = TRUE
GROUP BY pt.id, pt.name, pt.monthly_classes
ORDER BY active_subscriptions DESC;

GRANT SELECT ON plan_distribution TO authenticated;
