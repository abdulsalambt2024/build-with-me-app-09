
DROP POLICY IF EXISTS "System and admins can create notifications" ON public.notifications;
CREATE POLICY "System and admins can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);
