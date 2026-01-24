-- Create popup_views table if not exists
CREATE TABLE IF NOT EXISTS public.popup_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  popup_id UUID NOT NULL REFERENCES public.popups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(popup_id, user_id)
);

-- Enable RLS
ALTER TABLE public.popup_views ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view their own popup views" ON public.popup_views;
DROP POLICY IF EXISTS "Users can insert their own popup views" ON public.popup_views;

-- Popup views policies
CREATE POLICY "Users can view their own popup views"
  ON public.popup_views FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own popup views"
  ON public.popup_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index if not exists
CREATE INDEX IF NOT EXISTS idx_popup_views_user ON public.popup_views(user_id);