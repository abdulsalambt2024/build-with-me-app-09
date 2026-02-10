
-- Fix overly permissive RLS policies (the "true" WITH CHECK on audit_logs insert is for service role, that's fine)
-- Fix donation_receipts insert policy to require auth
DROP POLICY IF EXISTS "System can create donation receipts" ON public.donation_receipts;
CREATE POLICY "System can create donation receipts" ON public.donation_receipts
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'::text OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Fix donations insert policy
DROP POLICY IF EXISTS "Anyone can create donations" ON public.donations;
CREATE POLICY "Authenticated users can create donations" ON public.donations
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'::text AND
    ((user_id IS NULL) OR (auth.uid() = user_id))
  );

-- Clean up duplicate/conflicting RLS policies that were added
-- Remove duplicate policies from various tables that have both old and new patterns

-- achievements: remove duplicates
DROP POLICY IF EXISTS "achievements_insert_own" ON public.achievements;
DROP POLICY IF EXISTS "achievements_select_own_or_super" ON public.achievements;

-- ai_usage: remove duplicates  
DROP POLICY IF EXISTS "ai_usage_insert_own" ON public.ai_usage;
DROP POLICY IF EXISTS "ai_usage_select_own_or_super" ON public.ai_usage;

-- announcement_reads: remove duplicates
DROP POLICY IF EXISTS "announcement_reads_insert_own" ON public.announcement_reads;
DROP POLICY IF EXISTS "announcement_reads_select_own_or_super" ON public.announcement_reads;

-- attendance: remove duplicates
DROP POLICY IF EXISTS "attendance_insert_own" ON public.attendance;
DROP POLICY IF EXISTS "attendance_select_own_or_super" ON public.attendance;

-- comments: remove duplicates  
DROP POLICY IF EXISTS "comments_delete_own_or_super" ON public.comments;
DROP POLICY IF EXISTS "comments_insert_own" ON public.comments;
DROP POLICY IF EXISTS "comments_select_own_or_super" ON public.comments;
DROP POLICY IF EXISTS "comments_update_own_or_super" ON public.comments;

-- donations: remove duplicates
DROP POLICY IF EXISTS "donations_insert_own_or_anonymous" ON public.donations;
DROP POLICY IF EXISTS "donations_select_own_or_super" ON public.donations;

-- event_rsvps: remove duplicates
DROP POLICY IF EXISTS "event_rsvps_delete_own_or_super" ON public.event_rsvps;
DROP POLICY IF EXISTS "event_rsvps_insert_own" ON public.event_rsvps;
DROP POLICY IF EXISTS "event_rsvps_select_own_or_super" ON public.event_rsvps;
DROP POLICY IF EXISTS "event_rsvps_update_own_or_super" ON public.event_rsvps;

-- messages: remove duplicates
DROP POLICY IF EXISTS "messages_delete_own_or_super" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
DROP POLICY IF EXISTS "messages_select_own_or_super" ON public.messages;
DROP POLICY IF EXISTS "messages_update_own_or_super" ON public.messages;

-- message_reactions: remove duplicates
DROP POLICY IF EXISTS "message_reactions_delete_own_or_super" ON public.message_reactions;
DROP POLICY IF EXISTS "message_reactions_insert_own" ON public.message_reactions;
DROP POLICY IF EXISTS "message_reactions_select_own_or_super" ON public.message_reactions;

-- message_read_status: remove duplicates
DROP POLICY IF EXISTS "message_read_status_delete_own_or_super" ON public.message_read_status;
DROP POLICY IF EXISTS "message_read_status_insert_own" ON public.message_read_status;
DROP POLICY IF EXISTS "message_read_status_select_own_or_super" ON public.message_read_status;

-- notifications: remove duplicates
DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_own_or_super" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own_or_super" ON public.notifications;

-- popup_views: remove duplicates
DROP POLICY IF EXISTS "popup_views_insert_own" ON public.popup_views;
DROP POLICY IF EXISTS "popup_views_select_own_or_super" ON public.popup_views;

-- member_statistics: remove duplicate
DROP POLICY IF EXISTS "member_statistics_select_own_or_super" ON public.member_statistics;

-- chat_rooms: remove duplicates
DROP POLICY IF EXISTS "chat_rooms_delete_owner_only" ON public.chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_insert_owns_created_by" ON public.chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_update_owner_only" ON public.chat_rooms;

-- Add proper task RLS policies for the new assignment model
-- Tasks: admins and super_admins can manage, assigned users can view their own
DROP POLICY IF EXISTS "tasks_select_assigned_or_admin" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_admin" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_admin_or_assigned" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_admin" ON public.tasks;

CREATE POLICY "tasks_select_assigned_or_admin" ON public.tasks
  FOR SELECT USING (
    auth.uid() = assigned_to OR
    auth.uid() = assigned_by OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "tasks_insert_admin" ON public.tasks
  FOR INSERT WITH CHECK (
    auth.uid() = assigned_by AND (
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'super_admin'::app_role)
    )
  );

CREATE POLICY "tasks_update_admin_or_assigned" ON public.tasks
  FOR UPDATE USING (
    auth.uid() = assigned_to OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "tasks_delete_admin" ON public.tasks
  FOR DELETE USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );
