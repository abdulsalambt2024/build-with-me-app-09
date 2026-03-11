
-- Allow super admins to update any user's profile
CREATE POLICY "Super admins can update any profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Add notification triggers for announcements
CREATE OR REPLACE FUNCTION public.notify_new_announcement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, related_id)
  SELECT p.user_id, 'New Announcement', 'New announcement: ' || NEW.title, 'announcement', NEW.id
  FROM public.profiles p
  WHERE p.user_id != NEW.created_by AND p.is_disabled = false;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_announcement
AFTER INSERT ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.notify_new_announcement();

-- Add notification trigger for new events
CREATE OR REPLACE FUNCTION public.notify_new_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, related_id)
  SELECT p.user_id, 'New Event', 'New event: ' || NEW.title, 'event', NEW.id
  FROM public.profiles p
  WHERE p.user_id != NEW.created_by AND p.is_disabled = false;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_event
AFTER INSERT ON public.events
FOR EACH ROW EXECUTE FUNCTION public.notify_new_event();

-- Add notification trigger for task assignments (recreate to ensure it exists)
CREATE TRIGGER on_task_assignment
AFTER INSERT ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.notify_task_assignment();

-- Allow authenticated users to insert notifications (for triggers via security definer)
CREATE POLICY "Allow notification inserts via triggers"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);
