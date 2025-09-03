-- Fix infinite recursion in group_members policies by creating security definer function
CREATE OR REPLACE FUNCTION public.get_user_groups(_user_id uuid)
RETURNS SETOF uuid AS $$
  SELECT group_id FROM public.group_members WHERE user_id = _user_id;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Drop and recreate the problematic policy  
DROP POLICY IF EXISTS "Users can view group members for their groups" ON public.group_members;

-- Recreate policy using the security definer function
CREATE POLICY "Users can view group members for their groups" 
ON public.group_members 
FOR SELECT 
USING (group_id IN (SELECT public.get_user_groups(auth.uid())));

-- Add real-time support for personal_todos table only
ALTER TABLE public.personal_todos REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.personal_todos;