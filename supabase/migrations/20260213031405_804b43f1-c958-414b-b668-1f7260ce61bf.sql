
-- Add link_url to slideshows for clickable slides
ALTER TABLE public.slideshows ADD COLUMN IF NOT EXISTS link_url TEXT;

-- Ensure comments can be deleted by commenter and super admins
-- (RLS policy already allows delete for owner, let's ensure super_admin can too)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Super admins can delete any comment' AND tablename = 'comments') THEN
    CREATE POLICY "Super admins can delete any comment"
      ON public.comments FOR DELETE
      USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
      );
  END IF;
END $$;

-- Ensure comment owners can delete their own comments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own comments' AND tablename = 'comments') THEN
    CREATE POLICY "Users can delete own comments"
      ON public.comments FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;
