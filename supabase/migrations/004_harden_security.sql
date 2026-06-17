-- ============================================================
-- Migration 004: Harden Security
-- 
-- IMPORTANT: Run this migration on existing databases to apply
-- the security hardening changes from the MVP review.
--
-- Changes:
-- 1. Hardcodes trigger to always create users with role='user'
-- 2. Replaces permissive task update policy with strict 
--    state-transition-based policy
-- ============================================================

-- 1. Harden the new-user trigger to NEVER trust client role metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'user'::public.user_role  -- HARDCODED: admin promotion is manual only
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Drop the old permissive user-update policy
DROP POLICY IF EXISTS "Allow assigned users to update task status to submitted" ON public.tasks;
DROP POLICY IF EXISTS "tasks_user_submit" ON public.tasks;

-- 3. Create strict state-transition policy
-- Users can ONLY move tasks to 'submitted' status, and ONLY from
-- states where submission is logically valid.
CREATE POLICY "tasks_user_submit"
  ON public.tasks FOR UPDATE
  USING (
    auth.uid() = assigned_to
    AND status IN ('pending'::task_status, 'changes_requested'::task_status, 'rejected'::task_status)
  )
  WITH CHECK (
    auth.uid() = assigned_to
    AND status = 'submitted'::task_status
  );
