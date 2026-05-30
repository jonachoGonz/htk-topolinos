-- Migration 004: Plans Admin Enhancements
-- Date: 2026-05-30
-- Purpose: Expand plan_templates schema, set admin flag, auto-assign default plan to new students

-- ===================================================================
-- 0. Relax legacy CHECK constraints so price=0 (free / default plan) is allowed
-- ===================================================================
ALTER TABLE plan_templates
  DROP CONSTRAINT IF EXISTS plan_templates_price_per_month_check;
ALTER TABLE plan_templates
  ADD CONSTRAINT plan_templates_price_per_month_check
  CHECK (price_per_month >= 0);

-- (sessions_per_month > 0 stays — a plan with zero classes makes no sense)

-- ===================================================================
-- 1. EXPAND plan_templates with all the new fields from MVP spec
-- ===================================================================
ALTER TABLE plan_templates
  ADD COLUMN IF NOT EXISTS monthly_classes INTEGER DEFAULT 4,
  ADD COLUMN IF NOT EXISTS allowed_renewals TEXT[] DEFAULT ARRAY['monthly']::TEXT[],
  ADD COLUMN IF NOT EXISTS prices JSONB DEFAULT '{"monthly":0,"trimestral":0,"semestral":0,"anual":0}'::JSONB,
  ADD COLUMN IF NOT EXISTS accepts_discount_codes BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS discount_code TEXT,
  ADD COLUMN IF NOT EXISTS description_rich TEXT, -- markdown / HTML
  ADD COLUMN IF NOT EXISTS includes_sessions BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS session_count_monthly INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS session_type TEXT
    CHECK (session_type IN ('terapia', 'kinesiologia', 'nutricional', 'otra', NULL)),
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE; -- the default basic plan

-- Ensure only ONE default plan exists at a time
CREATE UNIQUE INDEX IF NOT EXISTS uq_plan_templates_one_default
  ON plan_templates(is_default) WHERE is_default = TRUE;

-- Backfill: copy sessions_per_month into monthly_classes if monthly_classes is default 4
UPDATE plan_templates
SET monthly_classes = sessions_per_month
WHERE monthly_classes = 4 AND sessions_per_month <> 4;

-- Backfill: copy price_per_month into prices.monthly
UPDATE plan_templates
SET prices = jsonb_set(prices, '{monthly}', to_jsonb(price_per_month))
WHERE (prices->>'monthly')::BIGINT = 0 AND price_per_month > 0;

-- ===================================================================
-- 2. INSERT default basic plan if none exists
-- ===================================================================
DO $$
DECLARE
  v_admin_id UUID;
BEGIN
  -- Find an existing admin / any teacher as fallback owner
  SELECT id INTO v_admin_id FROM profiles WHERE is_admin = TRUE LIMIT 1;
  IF v_admin_id IS NULL THEN
    SELECT id INTO v_admin_id FROM profiles WHERE role = 'teacher' LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM plan_templates WHERE is_default = TRUE) THEN
    INSERT INTO plan_templates (
      professional_id, name, description, description_rich,
      sessions_per_month, monthly_classes,
      price_per_month, prices,
      allowed_renewals,
      accepts_discount_codes,
      includes_sessions, session_count_monthly, session_type,
      is_active, is_default
    ) VALUES (
      v_admin_id,
      'Plan Básico',
      'Plan básico de 4 clases mensuales',
      '## Plan Básico\n\nIncluye **4 clases** de kinesiología al mes.',
      4, 4,
      0, '{"monthly":0,"trimestral":0,"semestral":0,"anual":0}'::JSONB,
      ARRAY['monthly']::TEXT[],
      FALSE,
      FALSE, 0, NULL,
      TRUE, TRUE
    );
  END IF;
END $$;

-- ===================================================================
-- 3. Ensure profesor@test.com is admin
-- ===================================================================
-- Find the auth.users id from email and set profile.is_admin = true
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'profesor@test.com';
  IF v_user_id IS NOT NULL THEN
    -- Update profile if it exists
    UPDATE profiles SET is_admin = TRUE WHERE id = v_user_id;
    -- If profile doesn't exist yet, the next login will create it; admin can also be set in DB later
  END IF;
END $$;

-- ===================================================================
-- 4. Trigger: auto-assign default plan to new students on profile insert
-- ===================================================================
CREATE OR REPLACE FUNCTION assign_default_plan_on_student_creation()
RETURNS TRIGGER AS $$
DECLARE
  v_default_template RECORD;
BEGIN
  -- Only for students
  IF NEW.role <> 'student' THEN
    RETURN NEW;
  END IF;

  -- Don't reassign if student already has an active plan
  IF EXISTS (
    SELECT 1 FROM plans
    WHERE student_id = NEW.id AND is_active = TRUE
  ) THEN
    RETURN NEW;
  END IF;

  -- Find the default template
  SELECT * INTO v_default_template
  FROM plan_templates
  WHERE is_default = TRUE AND is_active = TRUE
  LIMIT 1;

  IF v_default_template.id IS NOT NULL THEN
    INSERT INTO plans (
      student_id, name, total_sessions, remaining_sessions,
      monthly_class_count, expiry_date, is_active
    ) VALUES (
      NEW.id,
      v_default_template.name,
      v_default_template.monthly_classes,
      v_default_template.monthly_classes,
      v_default_template.monthly_classes,
      NOW() + INTERVAL '1 month',
      TRUE
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS trg_assign_default_plan ON profiles;
CREATE TRIGGER trg_assign_default_plan
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_default_plan_on_student_creation();

-- ===================================================================
-- 5. Backfill: assign default plan to existing students without one
-- ===================================================================
DO $$
DECLARE
  v_default_template RECORD;
  v_student RECORD;
BEGIN
  SELECT * INTO v_default_template
  FROM plan_templates
  WHERE is_default = TRUE AND is_active = TRUE
  LIMIT 1;

  IF v_default_template.id IS NULL THEN
    RAISE NOTICE 'No default plan template found; skipping backfill.';
    RETURN;
  END IF;

  FOR v_student IN
    SELECT p.id, p.full_name
    FROM profiles p
    WHERE p.role = 'student'
      AND NOT EXISTS (
        SELECT 1 FROM plans WHERE student_id = p.id AND is_active = TRUE
      )
  LOOP
    INSERT INTO plans (
      student_id, name, total_sessions, remaining_sessions,
      monthly_class_count, expiry_date, is_active
    ) VALUES (
      v_student.id,
      v_default_template.name,
      v_default_template.monthly_classes,
      v_default_template.monthly_classes,
      v_default_template.monthly_classes,
      NOW() + INTERVAL '1 month',
      TRUE
    );
  END LOOP;
END $$;

-- ===================================================================
-- 6. RPC: admin assigns a plan_template to a student
-- ===================================================================
CREATE OR REPLACE FUNCTION admin_assign_plan_to_student(
  p_student_id UUID,
  p_plan_template_id UUID,
  p_duration_months INTEGER DEFAULT 1
) RETURNS JSON AS $$
DECLARE
  v_template RECORD;
  v_plan_id UUID;
BEGIN
  -- Get the template
  SELECT * INTO v_template
  FROM plan_templates
  WHERE id = p_plan_template_id AND is_active = TRUE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Plan template not found or inactive');
  END IF;

  -- Deactivate any existing active plan
  UPDATE plans
  SET is_active = FALSE
  WHERE student_id = p_student_id AND is_active = TRUE;

  -- Insert the new active plan
  INSERT INTO plans (
    student_id, name, total_sessions, remaining_sessions,
    monthly_class_count, expiry_date, is_active
  ) VALUES (
    p_student_id,
    v_template.name,
    v_template.monthly_classes * p_duration_months,
    v_template.monthly_classes * p_duration_months,
    v_template.monthly_classes,
    NOW() + (p_duration_months || ' months')::INTERVAL,
    TRUE
  )
  RETURNING id INTO v_plan_id;

  RETURN json_build_object(
    'success', true,
    'plan_id', v_plan_id,
    'name', v_template.name,
    'sessions', v_template.monthly_classes * p_duration_months,
    'expiry_months', p_duration_months
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- 7. RLS policies: allow admin to manage plans
-- ===================================================================
-- Drop existing restrictive policy if any
DROP POLICY IF EXISTS "Admin can manage all plans" ON plans;
DROP POLICY IF EXISTS "Admin can manage all plan_templates" ON plan_templates;

CREATE POLICY "Admin can manage all plans"
  ON plans
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

CREATE POLICY "Admin can manage all plan_templates"
  ON plan_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Students can read plan_templates (so they can see plans available to them)
DROP POLICY IF EXISTS "Anyone can read active plan_templates" ON plan_templates;
CREATE POLICY "Anyone can read active plan_templates"
  ON plan_templates
  FOR SELECT
  USING (is_active = TRUE);
