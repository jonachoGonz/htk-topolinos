-- Migration 026: Restore anon EXECUTE on is_user_admin/is_user_teacher
-- Date: 2026-06-24
-- Problem: Migration 022 revoked EXECUTE on is_user_admin(uuid) and
-- is_user_teacher(uuid) from anon, treating them as "internal RLS helpers"
-- that didn't need a grant of their own. That's wrong: several RLS
-- policies for role `public` (which anon belongs to) call these functions
-- in their USING clause — e.g. "Admin can manage all plan_templates" on
-- plan_templates, "Admin can manage all plans" on plans, and
-- "Teachers/admin can read all notes" on patient_notes. Postgres must
-- execute the function to evaluate the policy for ANY request against
-- those tables, anon included — so revoking anon's EXECUTE broke even
-- anonymous SELECTs with `permission denied for function is_user_admin`
-- (PostgREST surfaces this as a 401), instead of just denying admin-only
-- access. This is what broke the public "Planes" section on the landing
-- page (getPublicPlans() querying plan_templates as anon).
--
-- Fix: re-grant EXECUTE to anon, matching the original grant from
-- migration 006. Both functions are SECURITY DEFINER and return FALSE
-- immediately when auth.uid() is NULL (the anon case), so this does not
-- expose any admin/teacher-only data — it only lets the boolean check
-- run so the policy can correctly fall through to the public-read policy.

GRANT EXECUTE ON FUNCTION public.is_user_admin(uuid)   TO anon;
GRANT EXECUTE ON FUNCTION public.is_user_teacher(uuid) TO anon;
