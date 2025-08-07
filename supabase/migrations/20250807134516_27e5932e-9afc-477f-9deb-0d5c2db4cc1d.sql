-- Add size field to menu_items table
ALTER TABLE public.menu_items ADD COLUMN size TEXT;

-- Create activity_logs table for tracking user actions
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for activity_logs
CREATE POLICY "Authenticated users can view activity logs"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert activity logs"
ON public.activity_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create function to log activities
CREATE OR REPLACE FUNCTION public.log_activity(
  action_type TEXT,
  description_text TEXT,
  metadata_json JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.activity_logs (user_id, action, description, metadata)
  VALUES (auth.uid(), action_type, description_text, metadata_json)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;