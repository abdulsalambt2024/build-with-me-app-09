
-- 1. Remove sensitive tables from Realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.chatbot_conversations;
ALTER PUBLICATION supabase_realtime DROP TABLE public.attendance;
ALTER PUBLICATION supabase_realtime DROP TABLE public.member_statistics;
ALTER PUBLICATION supabase_realtime DROP TABLE public.feedback;
ALTER PUBLICATION supabase_realtime DROP TABLE public.suggestions;

-- 2. Fix chat-media INSERT to require member/admin/super_admin role
DROP POLICY IF EXISTS "Users can upload own chat media" ON storage.objects;
CREATE POLICY "Users can upload own chat media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-media'
  AND (auth.uid())::text = (storage.foldername(name))[1]
  AND (
    public.has_role(auth.uid(), 'member')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
);

-- 3. Set search_path on trigger function missing it
CREATE OR REPLACE FUNCTION public.set_chat_room_created_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := (select auth.uid());
  END IF;
  RETURN NEW;
END;
$function$;

-- 4. Revoke EXECUTE on sensitive SECURITY DEFINER functions from anon/public
-- Trigger functions never need to be callable from API:
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_announcement() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_event() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_task_assignment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_post_likes_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_post_comments_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_event_attendees_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_campaign_amount() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_chat_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_user_to_community_chat() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_super_admins() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_chat_room_created_by() FROM PUBLIC, anon, authenticated;

-- Admin/sensitive RPCs: lock down to authenticated only (or service_role)
REVOKE EXECUTE ON FUNCTION public.assign_super_admin_by_email(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_audit_event(uuid, text, text, text, jsonb, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.toggle_user_disabled(uuid, uuid, boolean, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_user_role_atomic(uuid, uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.search_users_paginated(text, text, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_room_participant(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_private_profile_fields() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_upi_qr_data(text, text, numeric, text) FROM anon;

-- 5. Ensure column-level revoke on profiles sensitive fields persists
REVOKE SELECT (father_name, date_of_birth) ON public.profiles FROM anon, authenticated;
