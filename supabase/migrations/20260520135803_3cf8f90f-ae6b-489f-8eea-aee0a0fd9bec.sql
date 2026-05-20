
-- ============ SECURITY FIXES ============

-- 1) Campaigns: move webhook_secret out of broadly-readable table
CREATE TABLE IF NOT EXISTS public.campaign_secrets (
  campaign_id uuid PRIMARY KEY REFERENCES public.campaigns(id) ON DELETE CASCADE,
  webhook_secret text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.campaign_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage campaign secrets" ON public.campaign_secrets;
CREATE POLICY "Admins manage campaign secrets"
  ON public.campaign_secrets
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

INSERT INTO public.campaign_secrets (campaign_id, webhook_secret)
  SELECT id, webhook_secret FROM public.campaigns WHERE webhook_secret IS NOT NULL
  ON CONFLICT (campaign_id) DO NOTHING;

ALTER TABLE public.campaigns DROP COLUMN IF EXISTS webhook_secret;

-- 2) user_roles: restrict SELECT to own row only
DROP POLICY IF EXISTS user_roles_select_authenticated ON public.user_roles;
DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
CREATE POLICY user_roles_select_own
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Super admins also need to see all role rows for admin UIs
DROP POLICY IF EXISTS user_roles_select_super_admin ON public.user_roles;
CREATE POLICY user_roles_select_super_admin
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- 3) Profiles: hide truly-private admin metadata columns from clients
--    (date_of_birth / father_name / roll_number remain readable because the
--     AllMembers feature intentionally exposes them to authenticated users.)
REVOKE SELECT (disabled_reason, disabled_at, disabled_by) ON public.profiles FROM anon, authenticated;

-- 4) Remove push_subscriptions from realtime publication (creds leak)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'push_subscriptions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.push_subscriptions';
  END IF;
END $$;

-- 5) Enforce per-user path ownership on post-media and chat-media uploads
DROP POLICY IF EXISTS "Authenticated users can upload post media" ON storage.objects;
CREATE POLICY "Users can upload own post media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'post-media'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Authenticated users can upload chat media" ON storage.objects;
CREATE POLICY "Users can upload own chat media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-media'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- 6) Drop broken storage policies that join profiles.id = auth.uid()
--    (profiles uses user_id, so these silently returned no rows; equivalent
--     has_role()-based policies already exist for the same buckets.)
DROP POLICY IF EXISTS "Members can upload feed images" ON storage.objects;
DROP POLICY IF EXISTS "Members can view chat images" ON storage.objects;
DROP POLICY IF EXISTS "Members can upload chat images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload event posters" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete event posters" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload donation posters" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete donation posters" ON storage.objects;
DROP POLICY IF EXISTS "Super admins can upload slideshow images" ON storage.objects;
DROP POLICY IF EXISTS "Super admins can delete slideshow images" ON storage.objects;
DROP POLICY IF EXISTS "Super admins can upload popup images" ON storage.objects;
DROP POLICY IF EXISTS "Super admins can delete popup images" ON storage.objects;

-- Add a working feed-images upload policy (no equivalent existed)
DROP POLICY IF EXISTS "Members can upload feed images (role)" ON storage.objects;
CREATE POLICY "Members can upload feed images (role)"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'feed-images'
    AND (
      public.has_role(auth.uid(), 'member'::app_role)
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
    )
  );
