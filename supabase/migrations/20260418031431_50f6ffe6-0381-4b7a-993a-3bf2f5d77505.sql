-- Ad video settings (super admin managed)
CREATE TABLE IF NOT EXISTS public.ad_video_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_url TEXT NOT NULL,
  title TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_video_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active ads"
ON public.ad_video_settings FOR SELECT
USING (auth.role() = 'authenticated' AND is_active = true);

CREATE POLICY "Super admins can manage ads"
ON public.ad_video_settings FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER ad_video_settings_updated_at
BEFORE UPDATE ON public.ad_video_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for ad videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('ad-videos', 'ad-videos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view ad videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'ad-videos');

CREATE POLICY "Super admins can upload ad videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ad-videos' AND public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update ad videos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'ad-videos' AND public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete ad videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'ad-videos' AND public.has_role(auth.uid(), 'super_admin'));

-- Triggers for new content notifications
DROP TRIGGER IF EXISTS announcements_notify_trigger ON public.announcements;
CREATE TRIGGER announcements_notify_trigger
AFTER INSERT ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.notify_new_announcement();

DROP TRIGGER IF EXISTS events_notify_trigger ON public.events;
CREATE TRIGGER events_notify_trigger
AFTER INSERT ON public.events
FOR EACH ROW EXECUTE FUNCTION public.notify_new_event();

DROP TRIGGER IF EXISTS tasks_notify_trigger ON public.tasks;
CREATE TRIGGER tasks_notify_trigger
AFTER INSERT ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.notify_task_assignment();