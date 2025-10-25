-- Update user roles enum to include manager
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'manager', 'hr', 'employee');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Modify profiles role column if needed
ALTER TABLE public.profiles
  ALTER COLUMN role TYPE TEXT;

DROP TYPE IF EXISTS user_role CASCADE;
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'hr', 'employee');

ALTER TABLE public.profiles
  ALTER COLUMN role TYPE user_role USING role::user_role,
  ALTER COLUMN role SET DEFAULT 'employee'::user_role;

-- Create project_teams junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.project_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, team_id)
);

-- Enable RLS
ALTER TABLE public.project_teams ENABLE ROW LEVEL SECURITY;

-- Create policy for project_teams
CREATE POLICY "Anyone can view project teams"
ON public.project_teams
FOR SELECT
USING (true);

CREATE POLICY "Admins and managers can manage project teams"
ON public.project_teams
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Create project_discussions table
CREATE TABLE IF NOT EXISTS public.project_discussions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_discussions ENABLE ROW LEVEL SECURITY;

-- Create policies for discussions
CREATE POLICY "Users can view discussions for their projects"
ON public.project_discussions
FOR SELECT
USING (
  project_id IN (
    SELECT project_id FROM public.project_teams pt
    WHERE pt.team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  ) OR
  project_id IN (
    SELECT id FROM public.projects WHERE created_by = auth.uid()
  )
);

CREATE POLICY "Users can create discussions on their projects"
ON public.project_discussions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND (
    project_id IN (
      SELECT project_id FROM public.project_teams pt
      WHERE pt.team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    ) OR
    project_id IN (
      SELECT id FROM public.projects WHERE created_by = auth.uid()
    )
  )
);

-- Create project_documents table
CREATE TABLE IF NOT EXISTS public.project_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for documents
CREATE POLICY "Users can view documents for their projects"
ON public.project_documents
FOR SELECT
USING (
  project_id IN (
    SELECT project_id FROM public.project_teams pt
    WHERE pt.team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  ) OR
  project_id IN (
    SELECT id FROM public.projects WHERE created_by = auth.uid()
  )
);

CREATE POLICY "Users can upload documents to their projects"
ON public.project_documents
FOR INSERT
WITH CHECK (
  auth.uid() = uploaded_by AND (
    project_id IN (
      SELECT project_id FROM public.project_teams pt
      WHERE pt.team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    ) OR
    project_id IN (
      SELECT id FROM public.projects WHERE created_by = auth.uid()
    )
  )
);

-- Add timeline fields to tasks if not exists
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE;

-- Update projects RLS policies to restrict creation to admin/manager
DROP POLICY IF EXISTS "Authenticated users can create projects" ON public.projects;

CREATE POLICY "Admins and managers can create projects"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_discussions_updated_at
BEFORE UPDATE ON public.project_discussions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
