-- 1) Restrict profiles SELECT: hide administrative/sensitive columns from non-admins via column-level revoke
REVOKE SELECT (disabled_reason, disabled_by, disabled_at, is_disabled, roll_number, branch, course, semester, year, role)
  ON public.profiles FROM anon, authenticated;

-- Admin-only RPC to access full profile rows
CREATE OR REPLACE FUNCTION public.get_full_profile_admin(_user_id uuid)
RETURNS SETOF public.profiles
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.profiles
  WHERE user_id = _user_id
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
$$;
REVOKE EXECUTE ON FUNCTION public.get_full_profile_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_full_profile_admin(uuid) TO authenticated;

-- 2) Achievements are private — drop broad SELECT
DROP POLICY IF EXISTS "Authenticated users can view all achievements" ON public.achievements;
-- Keep "Users can view their own achievements"; add admin policy
DROP POLICY IF EXISTS "Admins can view all achievements" ON public.achievements;
CREATE POLICY "Admins can view all achievements"
  ON public.achievements FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- 3) Remove ai_usage from realtime publication (sensitive per-user prompts)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='ai_usage') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.ai_usage';
  END IF;
END $$;

-- 4) post-media UPDATE policy: add role check (members/admins only)
DROP POLICY IF EXISTS "post-media update role check" ON storage.objects;
CREATE POLICY "post-media update role check"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'post-media'
    AND (auth.uid())::text = (storage.foldername(name))[1]
    AND (public.has_role(auth.uid(),'member') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  )
  WITH CHECK (
    bucket_id = 'post-media'
    AND (auth.uid())::text = (storage.foldername(name))[1]
    AND (public.has_role(auth.uid(),'member') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  );

-- 5) Revoke EXECUTE on any remaining public SECURITY DEFINER functions from PUBLIC/anon/authenticated
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated', r.proname, r.args);
  END LOOP;
END $$;

-- Re-grant EXECUTE to authenticated for the RPCs the app explicitly calls
GRANT EXECUTE ON FUNCTION public.get_my_private_profile_fields() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_full_profile_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_users_paginated(text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_role_atomic(uuid, uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_user_disabled(uuid, uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_room_participant(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_upi_qr_data(text, text, numeric, text) TO authenticated;