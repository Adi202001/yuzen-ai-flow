-- Drop the existing policies that depend on the role column
DROP POLICY IF EXISTS "HR can manage all jobs" ON public.jobs;

-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('admin', 'hr', 'employee');

-- Update profiles table to use the new enum
ALTER TABLE public.profiles ALTER COLUMN role TYPE user_role USING role::user_role;

-- Set new default
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'employee'::user_role;

-- Create security definer function to check user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Recreate the jobs policies using the function
CREATE POLICY "HR can manage all jobs" ON public.jobs 
  FOR ALL USING (
    (auth.uid() = created_by) OR 
    (public.get_current_user_role() IN ('hr', 'admin'))
  );

-- Create tasks table for kanban
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  assignee_id UUID REFERENCES public.profiles(user_id),
  created_by UUID REFERENCES public.profiles(user_id) NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  tags TEXT[] DEFAULT '{}',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Tasks policies
CREATE POLICY "Anyone can view tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Users can create tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Task creators and assignees can update" ON public.tasks 
  FOR UPDATE USING (auth.uid() = created_by OR auth.uid() = assignee_id);
CREATE POLICY "Task creators can delete" ON public.tasks FOR DELETE USING (auth.uid() = created_by);

-- Create groups table for messaging
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.profiles(user_id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on groups
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Create group members table
CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Enable RLS on group members
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  sender_id UUID REFERENCES public.profiles(user_id) NOT NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.profiles(user_id),
  message_type TEXT DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT check_message_target CHECK (
    (group_id IS NOT NULL AND recipient_id IS NULL) OR 
    (group_id IS NULL AND recipient_id IS NOT NULL)
  )
);

-- Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create leave requests table
CREATE TABLE public.leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(user_id) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  leave_type TEXT NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  approved_by UUID REFERENCES public.profiles(user_id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on leave requests
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- Groups policies
CREATE POLICY "Users can view groups they belong to" ON public.groups 
  FOR SELECT USING (
    id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create groups" ON public.groups 
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creators can update groups" ON public.groups 
  FOR UPDATE USING (auth.uid() = created_by);

-- Group members policies
CREATE POLICY "Users can view group members for their groups" ON public.group_members 
  FOR SELECT USING (
    group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Group creators can manage members" ON public.group_members 
  FOR ALL USING (
    group_id IN (SELECT id FROM public.groups WHERE created_by = auth.uid())
  );

-- Messages policies
CREATE POLICY "Users can view messages in their groups" ON public.messages 
  FOR SELECT USING (
    (group_id IS NOT NULL AND group_id IN (
      SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
    )) OR
    (recipient_id = auth.uid() OR sender_id = auth.uid())
  );

CREATE POLICY "Users can send messages" ON public.messages 
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Leave requests policies
CREATE POLICY "Users can view their own leave requests" ON public.leave_requests 
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create leave requests" ON public.leave_requests 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their pending requests" ON public.leave_requests 
  FOR UPDATE USING (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "HR can view all leave requests" ON public.leave_requests 
  FOR SELECT USING (public.get_current_user_role() IN ('hr', 'admin'));

CREATE POLICY "HR can approve leave requests" ON public.leave_requests 
  FOR UPDATE USING (public.get_current_user_role() IN ('hr', 'admin'));

-- Create triggers for updated_at
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();