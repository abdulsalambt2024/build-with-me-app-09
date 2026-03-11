
-- Drop the overly permissive notification insert policy and replace with a more specific one
DROP POLICY IF EXISTS "Allow notification inserts via triggers" ON public.notifications;

-- The notification triggers use SECURITY DEFINER which bypasses RLS, so we don't need the permissive policy.
-- Keep only the existing admin insert policy which is already properly scoped.
