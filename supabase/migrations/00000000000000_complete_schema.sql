-- =====================================================
-- YUZEN AI FLOW - Complete Database Schema
-- =====================================================
-- This is the consolidated schema for the entire application
-- Run this in a fresh Supabase project

-- =====================================================
-- 1. EXTENSIONS & FUNCTIONS
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. ENUMS
-- =====================================================

-- User roles enum
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'manager', 'hr', 'employee');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 3. PROFILES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT UNIQUE,
  role user_role DEFAULT 'employee'::user_role,
  department TEXT,
  position TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);

-- Trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. TEAMS & TEAM MEMBERS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view teams they belong to" ON public.teams
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.team_id = teams.id
    AND team_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create teams" ON public.teams
FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Team creators can update teams" ON public.teams
FOR UPDATE USING (auth.uid() = created_by);

CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view team members for their teams" ON public.team_members
FOR SELECT USING (
  team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Team creators can manage members" ON public.team_members
FOR ALL USING (
  team_id IN (
    SELECT id FROM public.teams WHERE created_by = auth.uid()
  )
);

CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. PROJECTS & PROJECT TEAMS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  priority TEXT NOT NULL DEFAULT 'medium',
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view projects for their teams" ON public.projects
FOR SELECT USING (
  team_id IS NULL OR team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ) OR created_by = auth.uid()
);

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

CREATE POLICY "Project creators and team members can update projects" ON public.projects
FOR UPDATE USING (
  auth.uid() = created_by OR
  (team_id IS NOT NULL AND team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ))
);

CREATE POLICY "Project creators can delete projects" ON public.projects
FOR DELETE USING (auth.uid() = created_by);

-- Project-Teams junction table (many-to-many)
CREATE TABLE IF NOT EXISTS public.project_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, team_id)
);

ALTER TABLE public.project_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view project teams" ON public.project_teams FOR SELECT USING (true);

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

CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. TASKS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  assignee_id UUID REFERENCES public.profiles(user_id),
  created_by UUID REFERENCES public.profiles(user_id) NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  tags TEXT[] DEFAULT '{}',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Users can create tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Task creators and assignees can update" ON public.tasks
  FOR UPDATE USING (auth.uid() = created_by OR auth.uid() = assignee_id);
CREATE POLICY "Task creators can delete" ON public.tasks FOR DELETE USING (auth.uid() = created_by);

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. PROJECT DISCUSSIONS & DOCUMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.project_discussions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_discussions ENABLE ROW LEVEL SECURITY;

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

ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

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

CREATE TRIGGER update_project_discussions_updated_at
BEFORE UPDATE ON public.project_discussions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. ATTENDANCE SYSTEM
-- =====================================================

-- Office Settings
CREATE TABLE IF NOT EXISTS public.office_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Default Office',
  start_time TIME NOT NULL DEFAULT '09:00:00',
  end_time TIME NOT NULL DEFAULT '18:00:00',
  grace_period_minutes INTEGER DEFAULT 15,
  timezone TEXT DEFAULT 'UTC',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  radius_meters INTEGER DEFAULT 100,
  working_hours_per_day DECIMAL(4, 2) DEFAULT 8.0,
  working_days TEXT[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.office_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view office settings"
ON public.office_settings FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage office settings"
ON public.office_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
  )
);

INSERT INTO public.office_settings (name, start_time, end_time, grace_period_minutes)
VALUES ('Main Office', '09:00:00', '18:00:00', 15)
ON CONFLICT DO NOTHING;

-- Attendance
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  check_in TIMESTAMP WITH TIME ZONE,
  check_out TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'present',
  location TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  timezone TEXT DEFAULT 'UTC',
  work_hours DECIMAL(10, 2),
  overtime_hours DECIMAL(10, 2) DEFAULT 0,
  device_info TEXT,
  ip_address INET,
  notes TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  office_id UUID REFERENCES public.office_settings(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date),
  CONSTRAINT check_out_after_check_in CHECK (check_out IS NULL OR check_out > check_in)
);

CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON public.attendance(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance(status);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all attendance records"
ON public.attendance FOR SELECT USING (true);

CREATE POLICY "Users can create their own attendance"
ON public.attendance FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attendance"
ON public.attendance FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "HR can manage all attendance"
ON public.attendance FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('hr', 'admin')
  )
);

-- Attendance Breaks
CREATE TABLE IF NOT EXISTS public.attendance_breaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attendance_id UUID NOT NULL REFERENCES public.attendance(id) ON DELETE CASCADE,
  break_start TIMESTAMP WITH TIME ZONE NOT NULL,
  break_end TIMESTAMP WITH TIME ZONE,
  break_type TEXT DEFAULT 'break',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT break_end_after_start CHECK (break_end IS NULL OR break_end > break_start)
);

ALTER TABLE public.attendance_breaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their breaks"
ON public.attendance_breaks FOR SELECT
USING (
  attendance_id IN (
    SELECT id FROM public.attendance WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own breaks"
ON public.attendance_breaks FOR INSERT
WITH CHECK (
  attendance_id IN (
    SELECT id FROM public.attendance WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own breaks"
ON public.attendance_breaks FOR UPDATE
USING (
  attendance_id IN (
    SELECT id FROM public.attendance WHERE user_id = auth.uid()
  )
);

CREATE POLICY "HR can view all breaks"
ON public.attendance_breaks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('hr', 'admin')
  )
);

-- Attendance QR Codes
CREATE TABLE IF NOT EXISTS public.attendance_qr_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  qr_code TEXT NOT NULL UNIQUE,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.attendance_qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own QR codes"
ON public.attendance_qr_codes FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create QR codes"
ON public.attendance_qr_codes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Attendance Notifications
CREATE TABLE IF NOT EXISTS public.attendance_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.attendance_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their notifications"
ON public.attendance_notifications FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications"
ON public.attendance_notifications FOR UPDATE USING (user_id = auth.uid());

-- Attendance Functions
CREATE OR REPLACE FUNCTION calculate_work_hours(
  p_check_in TIMESTAMP WITH TIME ZONE,
  p_check_out TIMESTAMP WITH TIME ZONE,
  p_attendance_id UUID
)
RETURNS DECIMAL AS $$
DECLARE
  total_break_minutes DECIMAL;
  gross_hours DECIMAL;
  net_hours DECIMAL;
BEGIN
  SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (break_end - break_start))/60), 0)
  INTO total_break_minutes
  FROM public.attendance_breaks
  WHERE attendance_id = p_attendance_id AND break_end IS NOT NULL;

  gross_hours := EXTRACT(EPOCH FROM (p_check_out - p_check_in))/3600;
  net_hours := gross_hours - (total_break_minutes / 60);

  RETURN ROUND(net_hours, 2);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_overtime(
  p_work_hours DECIMAL,
  p_expected_hours DECIMAL DEFAULT 8.0
)
RETURNS DECIMAL AS $$
BEGIN
  IF p_work_hours > p_expected_hours THEN
    RETURN ROUND(p_work_hours - p_expected_hours, 2);
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auto_checkout_forgotten_users()
RETURNS void AS $$
DECLARE
  default_checkout_time TIME := '18:00:00';
BEGIN
  UPDATE public.attendance
  SET
    check_out = (date + default_checkout_time::TIME)::TIMESTAMP WITH TIME ZONE,
    notes = COALESCE(notes || ' | ', '') || 'Auto checked-out by system'
  WHERE
    date < CURRENT_DATE
    AND check_in IS NOT NULL
    AND check_out IS NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_daily_qr_code(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  qr_code TEXT;
  valid_until TIMESTAMP WITH TIME ZONE;
BEGIN
  valid_until := now() + INTERVAL '24 hours';
  qr_code := encode(
    digest(
      p_user_id::TEXT || now()::TEXT || random()::TEXT,
      'sha256'
    ),
    'hex'
  );

  INSERT INTO public.attendance_qr_codes (user_id, qr_code, valid_until)
  VALUES (p_user_id, qr_code, valid_until);

  RETURN qr_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger to calculate work hours on checkout
CREATE OR REPLACE FUNCTION trigger_calculate_work_hours()
RETURNS TRIGGER AS $$
DECLARE
  office_hours DECIMAL;
BEGIN
  IF NEW.check_out IS NOT NULL AND OLD.check_out IS NULL THEN
    SELECT working_hours_per_day INTO office_hours
    FROM public.office_settings
    WHERE is_active = true
    LIMIT 1;

    NEW.work_hours := calculate_work_hours(NEW.check_in, NEW.check_out, NEW.id);
    NEW.overtime_hours := calculate_overtime(NEW.work_hours, COALESCE(office_hours, 8.0));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_work_hours_on_checkout
BEFORE UPDATE ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION trigger_calculate_work_hours();

CREATE TRIGGER update_attendance_updated_at
BEFORE UPDATE ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_office_settings_updated_at
BEFORE UPDATE ON public.office_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Attendance Summary View
CREATE OR REPLACE VIEW attendance_summary AS
SELECT
  a.id,
  a.user_id,
  p.name as employee_name,
  a.date,
  a.check_in,
  a.check_out,
  a.status,
  a.location,
  a.work_hours,
  a.overtime_hours,
  COALESCE(
    (SELECT SUM(EXTRACT(EPOCH FROM (break_end - break_start))/60)
     FROM attendance_breaks
     WHERE attendance_id = a.id AND break_end IS NOT NULL),
    0
  ) as total_break_minutes,
  CASE
    WHEN a.check_in IS NULL THEN 'Not checked in'
    WHEN a.check_out IS NULL THEN 'In progress'
    WHEN a.work_hours < 8 THEN 'Undertime'
    WHEN a.work_hours >= 8 AND a.work_hours < 9 THEN 'Complete'
    ELSE 'Overtime'
  END as work_status
FROM public.attendance a
LEFT JOIN public.profiles p ON a.user_id = p.user_id;

GRANT SELECT ON attendance_summary TO authenticated;

-- =====================================================
-- 9. LEAVE REQUESTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.leave_requests (
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

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own leave requests" ON public.leave_requests
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create leave requests" ON public.leave_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their pending requests" ON public.leave_requests
  FOR UPDATE USING (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "HR can view all leave requests" ON public.leave_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role IN ('hr', 'admin')
    )
  );

CREATE POLICY "HR can approve leave requests" ON public.leave_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role IN ('hr', 'admin')
    )
  );

CREATE TRIGGER update_leave_requests_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 10. MESSAGING SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.profiles(user_id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view groups they belong to" ON public.groups
  FOR SELECT USING (
    id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create groups" ON public.groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creators can update groups" ON public.groups
  FOR UPDATE USING (auth.uid() = created_by);

CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view group members for their groups" ON public.group_members
  FOR SELECT USING (
    group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Group creators can manage members" ON public.group_members
  FOR ALL USING (
    group_id IN (SELECT id FROM public.groups WHERE created_by = auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.messages (
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

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their groups" ON public.messages
  FOR SELECT USING (
    (group_id IS NOT NULL AND group_id IN (
      SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
    )) OR
    (recipient_id = auth.uid() OR sender_id = auth.uid())
  );

CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 11. FILES & STORAGE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  category TEXT,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all files"
ON public.files FOR SELECT USING (true);

CREATE POLICY "Users can upload files"
ON public.files FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their own files"
ON public.files FOR DELETE USING (auth.uid() = uploaded_by);

CREATE POLICY "HR/Admin can manage all files"
ON public.files FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('hr', 'admin')
  )
);

CREATE TRIGGER update_files_updated_at
BEFORE UPDATE ON public.files
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Storage buckets (run this separately in Supabase dashboard if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('files', 'files', false)
-- ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- COMPLETE SCHEMA LOADED SUCCESSFULLY
-- =====================================================
