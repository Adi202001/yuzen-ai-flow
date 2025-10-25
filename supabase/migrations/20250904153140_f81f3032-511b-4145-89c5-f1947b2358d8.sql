-- Fix infinite recursion in groups policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.groups;

-- Create a proper policy without recursion
CREATE POLICY "Users can view groups they belong to" 
ON public.groups 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.group_members 
    WHERE group_members.group_id = groups.id 
    AND group_members.user_id = auth.uid()
  )
);

-- Create attendance table for real attendance tracking
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  check_in TIMESTAMP WITH TIME ZONE,
  check_out TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'present',
  location TEXT,
  notes TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS on attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Create policies for attendance
CREATE POLICY "Users can view all attendance records" 
ON public.attendance 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own attendance" 
ON public.attendance 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attendance" 
ON public.attendance 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "HR can manage all attendance" 
ON public.attendance 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('hr', 'admin')
  )
);

-- Create files table for real file management
CREATE TABLE IF NOT EXISTS public.files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  category TEXT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on files
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Create policies for files
CREATE POLICY "Users can view all files" 
ON public.files 
FOR SELECT 
USING (true);

CREATE POLICY "Users can upload files" 
ON public.files 
FOR INSERT 
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their own files" 
ON public.files 
FOR DELETE 
USING (auth.uid() = uploaded_by);

CREATE POLICY "HR/Admin can manage all files" 
ON public.files 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('hr', 'admin')
  )
);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('files', 'files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for files bucket
CREATE POLICY "Users can view files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'files');

CREATE POLICY "Users can upload files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Update updated_at trigger for new tables
CREATE TRIGGER update_attendance_updated_at
BEFORE UPDATE ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_files_updated_at
BEFORE UPDATE ON public.files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();