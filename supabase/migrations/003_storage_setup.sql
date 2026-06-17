-- ============================================================
-- Migration 003: Storage Setup
-- Creates the evidence bucket and its RLS policies.
-- ============================================================

-- Drop legacy storage policy names
DROP POLICY IF EXISTS "Allow users to upload evidence to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to read their own folder and admins to read all" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to delete storage objects" ON storage.objects;
DROP POLICY IF EXISTS "storage_user_upload" ON storage.objects;
DROP POLICY IF EXISTS "storage_read_visible" ON storage.objects;
DROP POLICY IF EXISTS "storage_admin_delete" ON storage.objects;

-- Create private bucket for evidence files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('evidence', 'evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Users can upload files to their own folder (user_id/*)
CREATE POLICY "storage_user_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'evidence' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users read their own files; admins read everything
CREATE POLICY "storage_read_visible"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'evidence'
    AND auth.role() = 'authenticated'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    )
  );

-- Only admins can delete storage objects
CREATE POLICY "storage_admin_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'evidence'
    AND auth.role() = 'authenticated'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );
