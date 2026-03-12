-- Allow users to permanently delete their own notifications
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to permanently delete their own PARI chat history entries
DROP POLICY IF EXISTS "Users can delete their own chatbot conversations" ON public.chatbot_conversations;
CREATE POLICY "Users can delete their own chatbot conversations"
ON public.chatbot_conversations
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);