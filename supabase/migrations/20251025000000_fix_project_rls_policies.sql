-- Drop conflicting policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.projects;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.projects;
DROP POLICY IF EXISTS "Enable update for project creators" ON public.projects;
DROP POLICY IF EXISTS "Users can view projects for their teams" ON public.projects;
DROP POLICY IF EXISTS "Users can create projects" ON public.projects;
DROP POLICY IF EXISTS "Project creators and team members can update projects" ON public.projects;
DROP POLICY IF EXISTS "Project creators can delete projects" ON public.projects;

-- Create unified RLS policies for projects
CREATE POLICY "Anyone can view projects"
ON public.projects
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create projects"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Project creators can update projects"
ON public.projects
FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Project creators can delete projects"
ON public.projects
FOR DELETE
USING (auth.uid() = created_by);
