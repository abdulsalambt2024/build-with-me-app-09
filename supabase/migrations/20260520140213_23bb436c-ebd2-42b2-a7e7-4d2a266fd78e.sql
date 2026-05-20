
-- Revoke public EXECUTE on SECURITY DEFINER functions that should never
-- be called directly by clients. Triggers don't need EXECUTE grants;
-- admin functions enforce checks internally but exposing them invites abuse.

DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    -- trigger functions
    'notify_new_announcement()',
    'notify_new_event()',
    'notify_task_assignment()',
    'update_post_likes_count()',
    'update_post_comments_count()',
    'update_event_attendees_count()',
    'update_campaign_amount()',
    'update_chat_updated_at()',
    'update_updated_at_column()',
    'set_chat_room_created_by()',
    'add_user_to_community_chat()',
    'handle_new_user()',
    'protect_super_admins()',
    -- admin / privileged helpers (still callable server-side or via RPC with auth check)
    'assign_super_admin_by_email(text)',
    'log_audit_event(uuid,text,text,text,jsonb,jsonb,jsonb)',
    'generate_upi_qr_data(text,text,numeric,text)'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'skip %: %', fn, SQLERRM;
    END;
  END LOOP;
END $$;

-- These remain callable (used in RLS / auth bootstrap / chat RLS):
--   has_role(uuid, app_role)
--   get_user_role(uuid)
--   is_room_participant(uuid, uuid)
--   toggle_user_disabled(...)   -- RPC used by admin UI; has internal role check
--   set_user_role_atomic(...)   -- RPC used by admin UI; has internal role check
--   search_users_paginated(...) -- RPC used by admin UI; has internal role check
