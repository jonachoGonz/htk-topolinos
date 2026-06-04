-- ============================================================
-- Migration 020: Nutrition tracking flag on plans
-- ============================================================
-- Adds a boolean toggle that marks a plan as including monthly
-- nutritional follow-up. The student panel uses this to warn the
-- patient when they haven't booked their monthly nutritionist
-- control.
--
-- Applies to both the catalog (plan_templates) and the assigned
-- instance (plans). The flag is copied when a plan is assigned.
-- ============================================================

ALTER TABLE public.plan_templates
  ADD COLUMN IF NOT EXISTS has_nutrition_tracking boolean NOT NULL DEFAULT false;

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS has_nutrition_tracking boolean NOT NULL DEFAULT false;

-- Optional backfill: if any historical plan was issued from a template
-- whose name already contains "nutri", flag it. Conservative — only
-- touches active plans.
UPDATE public.plans p
SET has_nutrition_tracking = true
WHERE p.is_active = true
  AND p.has_nutrition_tracking = false
  AND lower(p.name) LIKE '%nutri%';

-- ---------- Audit ----------
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name IN ('plans','plan_templates') AND column_name = 'has_nutrition_tracking';
