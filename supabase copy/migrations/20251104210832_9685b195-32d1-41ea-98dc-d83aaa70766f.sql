-- Create event_schedule_items table for non-recruiting time blocks (lunch, breaks, networking, etc.)
CREATE TABLE IF NOT EXISTS public.event_schedule_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'other',
  location TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

-- Create index for faster queries
CREATE INDEX idx_event_schedule_items_event_id ON public.event_schedule_items(event_id);
CREATE INDEX idx_event_schedule_items_time ON public.event_schedule_items(start_time, end_time);

-- Enable RLS
ALTER TABLE public.event_schedule_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Everyone can view active schedule items"
  ON public.event_schedule_items
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage schedule items"
  ON public.event_schedule_items
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_event_schedule_items_updated_at
  BEFORE UPDATE ON public.event_schedule_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.event_schedule_items IS 'Non-recruiting activities in the event schedule (lunch, breaks, networking, registration, etc.)';
COMMENT ON COLUMN public.event_schedule_items.item_type IS 'Type of schedule item: break, lunch, registration, networking, presentation, other';