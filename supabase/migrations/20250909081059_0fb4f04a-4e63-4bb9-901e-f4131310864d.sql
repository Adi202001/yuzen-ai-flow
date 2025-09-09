-- Fix the RLS policy causing infinite recursion
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON public.organizations;

-- Create a simpler policy to avoid recursion
CREATE POLICY "Users can view organizations they belong to" 
ON public.organizations 
FOR SELECT 
USING (
  (owner_id = auth.uid()) 
  OR 
  (EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_members.organization_id = organizations.id 
    AND organization_members.user_id = auth.uid()
  ))
);