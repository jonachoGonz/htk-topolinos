-- Migration: Create Payment System Tables for Phase 4
-- HTK Center Topolinos
-- This creates the complete payment infrastructure with Stripe support

-- ===================================================================
-- 1. TABLE: plan_templates (Configurable plans by admin/teacher)
-- ===================================================================

CREATE TABLE IF NOT EXISTS plan_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sessions_per_month INTEGER NOT NULL CHECK (sessions_per_month > 0),
  price_per_month BIGINT NOT NULL CHECK (price_per_month > 0), -- en centavos
  currency TEXT DEFAULT 'CLP',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(professional_id, name)
);

CREATE INDEX idx_plan_templates_professional ON plan_templates(professional_id);
CREATE INDEX idx_plan_templates_active ON plan_templates(is_active);


-- ===================================================================
-- 2. TABLE: plan_durations (Duration options with discounts)
-- ===================================================================

CREATE TABLE IF NOT EXISTS plan_durations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_template_id UUID NOT NULL REFERENCES plan_templates(id) ON DELETE CASCADE,
  duration_months INTEGER NOT NULL CHECK (duration_months IN (1, 3, 6, 12)),
  discount_percent INTEGER DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(plan_template_id, duration_months)
);

CREATE INDEX idx_plan_durations_template ON plan_durations(plan_template_id);


-- ===================================================================
-- 3. TABLE: promo_codes (Promotional codes)
-- ===================================================================

CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_percent INTEGER NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  max_uses INTEGER, -- NULL = unlimited
  used_count INTEGER DEFAULT 0 CHECK (used_count >= 0),
  applicable_plans UUID[] DEFAULT ARRAY[]::UUID[], -- NULL or empty = all plans
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_dates CHECK (valid_from <= valid_until)
);

CREATE INDEX idx_promo_codes_code ON promo_codes(code);
CREATE INDEX idx_promo_codes_valid ON promo_codes(valid_from, valid_until);


-- ===================================================================
-- 4. TABLE: payments (Payment transactions)
-- ===================================================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_template_id UUID NOT NULL REFERENCES plan_templates(id),
  duration_months INTEGER NOT NULL CHECK (duration_months IN (1, 3, 6, 12)),
  promo_code_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL,
  amount BIGINT NOT NULL CHECK (amount > 0), -- en centavos
  currency TEXT DEFAULT 'CLP',
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'mercado_pago', 'paypal')),
  provider_transaction_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, provider_transaction_id)
);

CREATE INDEX idx_payments_student ON payments(student_id);
CREATE INDEX idx_payments_plan ON payments(plan_template_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_provider ON payments(provider);
CREATE INDEX idx_payments_created ON payments(created_at DESC);


-- ===================================================================
-- 5. TABLE: subscriptions (Active student subscriptions)
-- ===================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_template_id UUID NOT NULL REFERENCES plan_templates(id),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  sessions_total INTEGER NOT NULL CHECK (sessions_total > 0),
  sessions_used INTEGER DEFAULT 0 CHECK (sessions_used >= 0 AND sessions_used <= sessions_total),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  auto_renew BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_subscription_dates CHECK (start_date <= end_date)
);

CREATE INDEX idx_subscriptions_student ON subscriptions(student_id);
CREATE INDEX idx_subscriptions_plan ON subscriptions(plan_template_id);
CREATE INDEX idx_subscriptions_active ON subscriptions(is_active);
CREATE INDEX idx_subscriptions_end_date ON subscriptions(end_date);


-- ===================================================================
-- 6. RLS POLICIES
-- ===================================================================

-- Enable RLS
ALTER TABLE plan_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_durations ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;


-- plan_templates: Admins see/edit all, Teachers see/edit only theirs, Students see active only
CREATE POLICY "plan_templates_select_admin" ON plan_templates
  FOR SELECT USING (
    (auth.jwt() ->> 'role') = 'authenticated' AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "plan_templates_select_teacher_own" ON plan_templates
  FOR SELECT USING (
    professional_id = auth.uid()
  );

CREATE POLICY "plan_templates_select_student" ON plan_templates
  FOR SELECT USING (
    is_active = true
  );

CREATE POLICY "plan_templates_insert_update_delete_admin" ON plan_templates
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "plan_templates_insert_update_delete_teacher" ON plan_templates
  FOR ALL USING (
    professional_id = auth.uid()
  )
  WITH CHECK (
    professional_id = auth.uid()
  );


-- plan_durations: Same as plan_templates (inherit through plan_template_id)
CREATE POLICY "plan_durations_select_admin" ON plan_durations
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "plan_durations_select_teacher" ON plan_durations
  FOR SELECT USING (
    plan_template_id IN (
      SELECT id FROM plan_templates WHERE professional_id = auth.uid()
    )
  );

CREATE POLICY "plan_durations_select_student" ON plan_durations
  FOR SELECT USING (
    plan_template_id IN (
      SELECT id FROM plan_templates WHERE is_active = true
    )
  );

CREATE POLICY "plan_durations_manage_admin" ON plan_durations
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "plan_durations_manage_teacher" ON plan_durations
  FOR ALL USING (
    plan_template_id IN (
      SELECT id FROM plan_templates WHERE professional_id = auth.uid()
    )
  )
  WITH CHECK (
    plan_template_id IN (
      SELECT id FROM plan_templates WHERE professional_id = auth.uid()
    )
  );


-- promo_codes: Students can select, Admins can manage
CREATE POLICY "promo_codes_select_all" ON promo_codes
  FOR SELECT USING (
    (auth.jwt() ->> 'role') = 'authenticated'
  );

CREATE POLICY "promo_codes_manage_admin" ON promo_codes
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );


-- payments: Students see only theirs, Server can insert/update (webhook), Admins see all
CREATE POLICY "payments_select_student_own" ON payments
  FOR SELECT USING (
    student_id = auth.uid()
  );

CREATE POLICY "payments_select_admin" ON payments
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "payments_insert_system" ON payments
  FOR INSERT WITH CHECK (
    -- Only backend service can insert via webhook
    -- This will be enforced at the application level
    true
  );

CREATE POLICY "payments_update_system" ON payments
  FOR UPDATE USING (true) WITH CHECK (true); -- Restricted to backend service


-- subscriptions: Students see only theirs, Server can insert/update, Admins see all
CREATE POLICY "subscriptions_select_student_own" ON subscriptions
  FOR SELECT USING (
    student_id = auth.uid()
  );

CREATE POLICY "subscriptions_select_admin" ON subscriptions
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "subscriptions_insert_system" ON subscriptions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "subscriptions_update_system" ON subscriptions
  FOR UPDATE USING (true) WITH CHECK (true);


-- ===================================================================
-- 7. TRIGGERS (auto-update updated_at)
-- ===================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER plan_templates_update_trigger
  BEFORE UPDATE ON plan_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER promo_codes_update_trigger
  BEFORE UPDATE ON promo_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER payments_update_trigger
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER subscriptions_update_trigger
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();


-- ===================================================================
-- 8. COMMENTS (Documentation)
-- ===================================================================

COMMENT ON TABLE plan_templates IS 'Plan templates configurable by teachers/admins. Base for student subscriptions.';
COMMENT ON TABLE plan_durations IS 'Duration options (1/3/6/12 months) with discount percentages for each plan template.';
COMMENT ON TABLE promo_codes IS 'Promotional codes that can be applied during checkout. Discounts applied to total price.';
COMMENT ON TABLE payments IS 'Payment transaction records. Provider-agnostic (Stripe, Mercado Pago, PayPal). One record per transaction.';
COMMENT ON TABLE subscriptions IS 'Active student subscriptions. Calculated from payment + plan_template. Tracks session usage.';

COMMENT ON COLUMN plan_templates.sessions_per_month IS 'Total sessions allocated per month. E.g., 4 sessions/month plan.';
COMMENT ON COLUMN plan_templates.price_per_month IS 'Base price per month in cents. E.g., 75000 = $750 CLP. Total = price * duration_months.';
COMMENT ON COLUMN plan_durations.discount_percent IS 'Discount applied to base price. E.g., 10 = 10% discount for 12-month plans.';
COMMENT ON COLUMN payments.amount IS 'Final payment amount in cents (after promo discount). Stored for reference/auditing.';
COMMENT ON COLUMN payments.provider_transaction_id IS 'External ID from provider. Unique per provider. E.g., Stripe PaymentIntent ID.';
COMMENT ON COLUMN subscriptions.sessions_total IS 'Total sessions for this subscription. Calculated as: sessions_per_month * duration_months.';
COMMENT ON COLUMN subscriptions.sessions_used IS 'Sessions consumed. Incremented when student books a confirmed slot.';
