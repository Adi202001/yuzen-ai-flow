-- =====================================================
-- Attendance System Enhancements
-- =====================================================
-- This migration adds new attendance features without touching existing tables

-- =====================================================
-- 1. ALTER EXISTING ATTENDANCE TABLE
-- =====================================================

-- Add new columns to existing attendance table
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS work_hours DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS overtime_hours DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS device_info TEXT,
  ADD COLUMN IF NOT EXISTS ip_address INET;

-- Add check constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_out_after_check_in'
  ) THEN
    ALTER TABLE public.attendance
    ADD CONSTRAINT check_out_after_check_in
    CHECK (check_out IS NULL OR check_out > check_in);
  END IF;
END $$;

-- Add indexes if not exist
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON public.attendance(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance(status);

-- =====================================================
-- 2. CREATE NEW TABLES
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

DROP POLICY IF EXISTS "Anyone can view office settings" ON public.office_settings;
CREATE POLICY "Anyone can view office settings"
ON public.office_settings FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage office settings" ON public.office_settings;
CREATE POLICY "Admins can manage office settings"
ON public.office_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Insert default office settings if not exists
INSERT INTO public.office_settings (name, start_time, end_time, grace_period_minutes)
VALUES ('Main Office', '09:00:00', '18:00:00', 15)
ON CONFLICT DO NOTHING;

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

DROP POLICY IF EXISTS "Users can view their breaks" ON public.attendance_breaks;
CREATE POLICY "Users can view their breaks"
ON public.attendance_breaks FOR SELECT
USING (
  attendance_id IN (
    SELECT id FROM public.attendance WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create their own breaks" ON public.attendance_breaks;
CREATE POLICY "Users can create their own breaks"
ON public.attendance_breaks FOR INSERT
WITH CHECK (
  attendance_id IN (
    SELECT id FROM public.attendance WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update their own breaks" ON public.attendance_breaks;
CREATE POLICY "Users can update their own breaks"
ON public.attendance_breaks FOR UPDATE
USING (
  attendance_id IN (
    SELECT id FROM public.attendance WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "HR can view all breaks" ON public.attendance_breaks;
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

DROP POLICY IF EXISTS "Users can view their own QR codes" ON public.attendance_qr_codes;
CREATE POLICY "Users can view their own QR codes"
ON public.attendance_qr_codes FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can create QR codes" ON public.attendance_qr_codes;
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

DROP POLICY IF EXISTS "Users can view their notifications" ON public.attendance_notifications;
CREATE POLICY "Users can view their notifications"
ON public.attendance_notifications FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their notifications" ON public.attendance_notifications;
CREATE POLICY "Users can update their notifications"
ON public.attendance_notifications FOR UPDATE USING (user_id = auth.uid());

-- Add office_id to attendance
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS office_id UUID REFERENCES public.office_settings(id) ON DELETE SET NULL;

-- =====================================================
-- 3. CREATE FUNCTIONS
-- =====================================================

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

-- =====================================================
-- 4. CREATE TRIGGERS
-- =====================================================

-- Trigger to calculate work hours on checkout
CREATE OR REPLACE FUNCTION trigger_calculate_work_hours()
RETURNS TRIGGER AS $$
DECLARE
  office_hours DECIMAL;
BEGIN
  IF NEW.check_out IS NOT NULL AND (OLD.check_out IS NULL OR OLD.check_out IS DISTINCT FROM NEW.check_out) THEN
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

DROP TRIGGER IF EXISTS calculate_work_hours_on_checkout ON public.attendance;
CREATE TRIGGER calculate_work_hours_on_checkout
BEFORE UPDATE ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION trigger_calculate_work_hours();

DROP TRIGGER IF EXISTS update_office_settings_updated_at ON public.office_settings;
CREATE TRIGGER update_office_settings_updated_at
BEFORE UPDATE ON public.office_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 5. CREATE VIEW
-- =====================================================

DROP VIEW IF EXISTS attendance_summary;
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
-- ATTENDANCE ENHANCEMENTS APPLIED SUCCESSFULLY
-- =====================================================
