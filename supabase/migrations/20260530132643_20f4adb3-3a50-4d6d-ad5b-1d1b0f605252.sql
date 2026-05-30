
-- 1. Remove sensitive financial tables from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.donations;
ALTER PUBLICATION supabase_realtime DROP TABLE public.donation_receipts;

-- 2. Restrict campaign_secrets to super_admin only
DROP POLICY IF EXISTS "Admins manage campaign secrets" ON public.campaign_secrets;
CREATE POLICY "Super admins manage campaign secrets"
ON public.campaign_secrets
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 3. Restrict sensitive profile fields via column-level revoke
REVOKE SELECT (father_name, date_of_birth) ON public.profiles FROM authenticated;
REVOKE SELECT (father_name, date_of_birth) ON public.profiles FROM anon;
-- Keep service_role full access; users can read their own via app code by using service-role or owner-only view.
-- Add owner-only access via a secure RPC for self-viewing
CREATE OR REPLACE FUNCTION public.get_my_private_profile_fields()
RETURNS TABLE(father_name text, date_of_birth text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT father_name, date_of_birth FROM public.profiles WHERE user_id = auth.uid()
$$;
REVOKE ALL ON FUNCTION public.get_my_private_profile_fields() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_private_profile_fields() TO authenticated;

-- 4. Add path-ownership check to chat-images and feed-images INSERT policies
DROP POLICY IF EXISTS "Chat images upload" ON storage.objects;
CREATE POLICY "Chat images upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
  AND (
    public.has_role(auth.uid(), 'member')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
);

DROP POLICY IF EXISTS "Members can upload feed images (role)" ON storage.objects;
CREATE POLICY "Members can upload feed images (role)"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'feed-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
  AND (
    public.has_role(auth.uid(), 'member')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
);

-- 5. Make user_roles INSERT/DELETE restriction explicit (service-role only via RPC)
DROP POLICY IF EXISTS "user_roles_no_client_insert" ON public.user_roles;
CREATE POLICY "user_roles_no_client_insert"
ON public.user_roles
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

DROP POLICY IF EXISTS "user_roles_no_client_delete" ON public.user_roles;
CREATE POLICY "user_roles_no_client_delete"
ON public.user_roles
FOR DELETE
TO authenticated, anon
USING (false);
