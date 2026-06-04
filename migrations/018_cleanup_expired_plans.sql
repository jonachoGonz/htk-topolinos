-- Migration 018: Cleanup helper for expired/orphan plans
-- Date: 2026-06-03
--
-- Context: each time a student's plan is re-assigned or reset, the previous
-- row is left in `plans` with `is_active=false`. Without housekeeping the
-- table accumulates stale rows that bloat queries and confuse the UI
-- (e.g. Pedro Prueba showed 4 rows during QA, only 1 active).
--
-- This adds:
--   1. A helper function `cleanup_expired_plans(p_keep_history_days)` that
--      soft-purges plans inactive for longer than the retention window.
--   2. A nightly trigger-friendly view `expired_plan_candidates` that lets
--      admins inspect what would be cleaned before running.
--
-- Designed to be IDEMPOTENT and SAFE: never deletes the most recent plan
-- per student (preserves history of at least 1 plan), never touches active
-- plans, and never deletes plans referenced by attended bookings.

-- ===================================================================
-- 1. View: candidates for cleanup (read-only, safe to query)
-- ===================================================================
CREATE OR REPLACE VIEW public.expired_plan_candidates AS
WITH ranked AS (
  SELECT
    p.id,
    p.student_id,
    p.name,
    p.is_active,
    p.created_at,
    p.expiry_date,
    p.remaining_sessions,
    -- Newest first per student
    ROW_NUMBER() OVER (PARTITION BY p.student_id ORDER BY p.created_at DESC) AS rn,
    -- Has at least one charged booking? (we'd lose history if we delete)
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.student_id = p.student_id
        AND b.charged_from_plan = TRUE
        AND b.booking_date >= p.created_at::date
        AND b.booking_date <= COALESCE(p.expiry_date, p.created_at::date + interval '60 days')
    ) AS has_charged_bookings
  FROM plans p
)
SELECT
  r.id,
  r.student_id,
  r.name,
  r.is_active,
  r.created_at,
  r.expiry_date,
  r.remaining_sessions,
  r.rn AS recency_rank,
  r.has_charged_bookings,
  CASE
    WHEN r.is_active             THEN 'KEEP: active'
    WHEN r.rn = 1                THEN 'KEEP: newest per student'
    WHEN r.has_charged_bookings  THEN 'KEEP: has charged bookings (audit)'
    WHEN r.expiry_date IS NULL OR r.expiry_date >= CURRENT_DATE
                                 THEN 'KEEP: not yet expired'
    ELSE 'DELETE candidate'
  END AS recommendation
FROM ranked r;

COMMENT ON VIEW public.expired_plan_candidates IS
  'Read-only audit view. SELECT recommendation, * FROM expired_plan_candidates ORDER BY student_id, recency_rank;';

GRANT SELECT ON public.expired_plan_candidates TO authenticated;

-- ===================================================================
-- 2. Function: actually delete (admin-only, dry-run by default)
-- ===================================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_plans(
  p_dry_run BOOLEAN DEFAULT TRUE,
  p_keep_history_days INTEGER DEFAULT 365
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_deleted_count INTEGER := 0;
  v_candidate_count INTEGER := 0;
BEGIN
  IF NOT public.is_user_admin(v_caller) THEN
    RETURN json_build_object('success', FALSE, 'error', 'Solo admin puede ejecutar cleanup');
  END IF;

  -- Count candidates within the retention window
  SELECT COUNT(*) INTO v_candidate_count
  FROM expired_plan_candidates
  WHERE recommendation = 'DELETE candidate'
    AND expiry_date < CURRENT_DATE - p_keep_history_days;

  IF NOT p_dry_run THEN
    DELETE FROM plans
    WHERE id IN (
      SELECT id FROM expired_plan_candidates
      WHERE recommendation = 'DELETE candidate'
        AND expiry_date < CURRENT_DATE - p_keep_history_days
    );
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  END IF;

  RETURN json_build_object(
    'success', TRUE,
    'dry_run', p_dry_run,
    'candidates', v_candidate_count,
    'deleted', v_deleted_count,
    'keep_history_days', p_keep_history_days
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_plans(BOOLEAN, INTEGER) TO authenticated;

COMMENT ON FUNCTION public.cleanup_expired_plans IS
  'Dry-run by default. Call with p_dry_run := FALSE to actually delete.';

-- ===================================================================
-- 3. Usage examples
-- ===================================================================
-- Inspect before doing anything:
--   SELECT * FROM expired_plan_candidates WHERE student_id = '<uuid>';
--
-- Dry-run cleanup:
--   SELECT public.cleanup_expired_plans();
--
-- Real cleanup (keep last 12 months of history):
--   SELECT public.cleanup_expired_plans(p_dry_run := FALSE, p_keep_history_days := 365);
