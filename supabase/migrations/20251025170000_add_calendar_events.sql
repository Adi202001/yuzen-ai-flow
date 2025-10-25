-- =====================================================
-- Calendar Events System
-- =====================================================

-- Create calendar events table
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'meeting',
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  all_day BOOLEAN DEFAULT false,
  location TEXT,
  color TEXT DEFAULT '#3b82f6',
  created_by UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,
  reminder_minutes INTEGER DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT end_after_start CHECK (end_time > start_time)
);

-- Create event attendees table
CREATE TABLE IF NOT EXISTS public.event_attendees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  response_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for calendar_events
DROP POLICY IF EXISTS "Users can view events they created or are invited to" ON public.calendar_events;
CREATE POLICY "Users can view events they created or are invited to"
ON public.calendar_events FOR SELECT
USING (
  created_by = auth.uid() OR
  id IN (
    SELECT event_id FROM public.event_attendees WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create events" ON public.calendar_events;
CREATE POLICY "Users can create events"
ON public.calendar_events FOR INSERT
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update their own events" ON public.calendar_events;
CREATE POLICY "Users can update their own events"
ON public.calendar_events FOR UPDATE
USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can delete their own events" ON public.calendar_events;
CREATE POLICY "Users can delete their own events"
ON public.calendar_events FOR DELETE
USING (auth.uid() = created_by);

-- RLS Policies for event_attendees
DROP POLICY IF EXISTS "Users can view attendees for their events" ON public.event_attendees;
CREATE POLICY "Users can view attendees for their events"
ON public.event_attendees FOR SELECT
USING (
  event_id IN (
    SELECT id FROM public.calendar_events
    WHERE created_by = auth.uid() OR
    id IN (SELECT event_id FROM public.event_attendees WHERE user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Event creators can manage attendees" ON public.event_attendees;
CREATE POLICY "Event creators can manage attendees"
ON public.event_attendees FOR ALL
USING (
  event_id IN (
    SELECT id FROM public.calendar_events WHERE created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Attendees can update their own status" ON public.event_attendees;
CREATE POLICY "Attendees can update their own status"
ON public.event_attendees FOR UPDATE
USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON public.calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON public.calendar_events(created_by);
CREATE INDEX IF NOT EXISTS idx_calendar_events_project ON public.calendar_events(project_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user ON public.event_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_event ON public.event_attendees(event_id);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON public.calendar_events;
CREATE TRIGGER update_calendar_events_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically create events from task due dates
CREATE OR REPLACE FUNCTION sync_task_due_dates_to_calendar()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.due_date IS NOT NULL AND (OLD.due_date IS NULL OR OLD.due_date != NEW.due_date) THEN
    INSERT INTO public.calendar_events (
      title,
      description,
      event_type,
      start_time,
      end_time,
      created_by,
      task_id,
      project_id,
      color
    )
    VALUES (
      'Task Due: ' || NEW.title,
      NEW.description,
      'task_due',
      NEW.due_date - INTERVAL '1 hour',
      NEW.due_date,
      NEW.created_by,
      NEW.id,
      NEW.project_id,
      '#ef4444'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync tasks with calendar
DROP TRIGGER IF EXISTS sync_task_to_calendar ON public.tasks;
CREATE TRIGGER sync_task_to_calendar
AFTER INSERT OR UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION sync_task_due_dates_to_calendar();

-- Create view for upcoming events
DROP VIEW IF EXISTS upcoming_events;
CREATE OR REPLACE VIEW upcoming_events AS
SELECT
  ce.id,
  ce.title,
  ce.description,
  ce.event_type,
  ce.start_time,
  ce.end_time,
  ce.location,
  ce.color,
  ce.created_by,
  p.name as creator_name,
  COALESCE(
    (SELECT json_agg(json_build_object(
      'user_id', ea.user_id,
      'name', prof.name,
      'status', ea.status
    ))
    FROM event_attendees ea
    LEFT JOIN profiles prof ON ea.user_id = prof.user_id
    WHERE ea.event_id = ce.id),
    '[]'
  ) as attendees
FROM public.calendar_events ce
LEFT JOIN public.profiles p ON ce.created_by = p.user_id
WHERE ce.start_time >= now()
ORDER BY ce.start_time ASC;

GRANT SELECT ON upcoming_events TO authenticated;

-- =====================================================
-- CALENDAR SYSTEM COMPLETED
-- =====================================================
