-- SQL Database Setup Script for PWA Task Evidence Uploader
-- Updated: Added 'changes_requested' status and admin_feedback column

-- 1. Create custom types
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'user');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
    CREATE TYPE task_status AS ENUM ('pending', 'submitted', 'approved', 'rejected', 'changes_requested');
  END IF;
END $$;

-- 2. Create tables
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  role user_role DEFAULT 'user'::user_role NOT NULL,
  full_name TEXT,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status task_status DEFAULT 'pending'::task_status NOT NULL,
  admin_feedback TEXT, -- Admin's comment when rejecting or requesting changes
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.evidence (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  file_path TEXT NOT NULL, -- Format: 'user_id/task_id_timestamp_filename.ext'
  file_name TEXT NOT NULL,
  title TEXT, -- Evidence title provided by user
  description TEXT,
  admin_feedback TEXT, -- Admin's feedback specifically for this evidence
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;

-- 4. Create trigger to automatically create profile on sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'user'::public.user_role)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. RLS Policies

-- Drop existing policies first to make the script re-runnable
DROP POLICY IF EXISTS "Allow public read access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to read assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow admins complete control over tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow assigned users to update task status to submitted" ON public.tasks;
DROP POLICY IF EXISTS "Allow users to read own evidence and admins to read all" ON public.evidence;
DROP POLICY IF EXISTS "Allow users to submit evidence for their tasks" ON public.evidence;
DROP POLICY IF EXISTS "Allow admins to delete evidence" ON public.evidence;
DROP POLICY IF EXISTS "Allow users to upload evidence to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to read their own folder and admins to read all" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to delete storage objects" ON storage.objects;

-- Profiles Policies
CREATE POLICY "Allow public read access to profiles" 
  ON public.profiles FOR SELECT 
  USING (true);

CREATE POLICY "Allow users to update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Tasks Policies
CREATE POLICY "Allow users to read assigned tasks" 
  ON public.tasks FOR SELECT 
  USING (
    auth.uid() = assigned_to OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Allow admins complete control over tasks" 
  ON public.tasks FOR ALL 
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Allow assigned users to update their own task status to 'submitted' only
-- (Business logic: user submits evidence -> status goes to 'submitted')
CREATE POLICY "Allow assigned users to update task status to submitted"
  ON public.tasks FOR UPDATE
  USING (
    auth.uid() = assigned_to
  )
  WITH CHECK (
    auth.uid() = assigned_to
    AND status IN ('submitted'::task_status)
  );

-- Evidence Policies
CREATE POLICY "Allow users to read own evidence and admins to read all" 
  ON public.evidence FOR SELECT 
  USING (
    auth.uid() = user_id OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Allow users to submit evidence for their tasks" 
  ON public.evidence FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE id = task_id AND assigned_to = auth.uid()
    )
  );

CREATE POLICY "Allow admins to delete evidence"
  ON public.evidence FOR DELETE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Allow admins to update evidence"
  ON public.evidence FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- 6. Set up Storage for Evidence
INSERT INTO storage.buckets (id, name, public) 
VALUES ('evidence', 'evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Allow users to upload evidence to their own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'evidence' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Allow users to read their own folder and admins to read all"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'evidence'
    AND auth.role() = 'authenticated'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    )
  );

CREATE POLICY "Allow admins to delete storage objects"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'evidence'
    AND auth.role() = 'authenticated'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- ============================================================
-- MIGRATION: Run this if you already have the old schema
-- ============================================================
-- ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'changes_requested';
-- ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS admin_feedback TEXT;
-- ALTER TABLE public.evidence ADD COLUMN IF NOT EXISTS admin_feedback TEXT;
