-- ============================================================
-- Migration 002: RLS Policies
-- Defines all Row Level Security policies for profiles, tasks, and evidence.
-- ============================================================

-- Drop existing policies first (idempotent)
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "tasks_select_visible" ON public.tasks;
DROP POLICY IF EXISTS "tasks_admin_all" ON public.tasks;
DROP POLICY IF EXISTS "tasks_user_submit" ON public.tasks;
DROP POLICY IF EXISTS "evidence_select_visible" ON public.evidence;
DROP POLICY IF EXISTS "evidence_user_insert" ON public.evidence;
DROP POLICY IF EXISTS "evidence_admin_delete" ON public.evidence;
DROP POLICY IF EXISTS "evidence_admin_update" ON public.evidence;

-- Also drop legacy policy names from old schema
DROP POLICY IF EXISTS "Allow public read access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to read assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow admins complete control over tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow assigned users to update task status to submitted" ON public.tasks;
DROP POLICY IF EXISTS "Allow users to read own evidence and admins to read all" ON public.evidence;
DROP POLICY IF EXISTS "Allow users to submit evidence for their tasks" ON public.evidence;
DROP POLICY IF EXISTS "Allow admins to delete evidence" ON public.evidence;
DROP POLICY IF EXISTS "Allow admins to update evidence" ON public.evidence;

-- ============================
-- PROFILES
-- ============================

-- All authenticated users can read profiles (needed for task assignment UI)
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT
  USING (true);

-- ============================
-- TASKS
-- ============================

-- Users see their assigned tasks; admins see everything
CREATE POLICY "tasks_select_visible"
  ON public.tasks FOR SELECT
  USING (
    auth.uid() = assigned_to
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Admins have full CRUD on tasks
CREATE POLICY "tasks_admin_all"
  ON public.tasks FOR ALL
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Assigned users can ONLY change status to 'submitted',
-- and ONLY from valid prior states (pending, changes_requested, rejected).
-- This prevents users from self-approving or setting arbitrary statuses.
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

-- ============================
-- EVIDENCE
-- ============================

-- Users see their own evidence; admins see everything
CREATE POLICY "evidence_select_visible"
  ON public.evidence FOR SELECT
  USING (
    auth.uid() = user_id
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Users can submit evidence only for tasks assigned to them
CREATE POLICY "evidence_user_insert"
  ON public.evidence FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.tasks
      WHERE id = task_id AND assigned_to = auth.uid()
    )
  );

-- Only admins can delete evidence
CREATE POLICY "evidence_admin_delete"
  ON public.evidence FOR DELETE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Only admins can update evidence (for adding feedback)
CREATE POLICY "evidence_admin_update"
  ON public.evidence FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );
