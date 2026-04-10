
-- 1. Fix search_users_paginated: add admin role gate
CREATE OR REPLACE FUNCTION public.search_users_paginated(p_search text DEFAULT ''::text, p_role_filter text DEFAULT 'all'::text, p_page integer DEFAULT 1, p_page_size integer DEFAULT 20)
 RETURNS TABLE(id uuid, user_id uuid, full_name text, avatar_url text, created_at timestamp with time zone, role text, bio text, course text, branch text, roll_number text, year text, semester text, father_name text, date_of_birth text, is_disabled boolean, total_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_offset INTEGER;
  v_total BIGINT;
BEGIN
  -- Only admins and super_admins can use this function
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  v_offset := (p_page - 1) * p_page_size;
  
  SELECT COUNT(*)::BIGINT INTO v_total
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE 
    (p_search = '' OR p.full_name ILIKE '%' || p_search || '%')
    AND (p_role_filter = 'all' OR ur.role::TEXT = p_role_filter);

  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.full_name,
    p.avatar_url,
    p.created_at,
    COALESCE(ur.role::TEXT, 'viewer'),
    p.bio,
    p.course,
    p.branch,
    p.roll_number,
    p.year,
    p.semester,
    p.father_name,
    p.date_of_birth,
    COALESCE(p.is_disabled, false),
    v_total
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE 
    (p_search = '' OR p.full_name ILIKE '%' || p_search || '%')
    AND (p_role_filter = 'all' OR ur.role::TEXT = p_role_filter)
  ORDER BY p.created_at DESC
  LIMIT p_page_size
  OFFSET v_offset;
END;
$function$;

-- 2. Fix notifications INSERT: restrict to own notifications or admin/service_role
DROP POLICY IF EXISTS "System and admins can create notifications" ON public.notifications;
CREATE POLICY "Users can create own notifications or admins can create any"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- 3. Fix audit_logs INSERT: only allow via service_role (log_audit_event is SECURITY DEFINER)
DROP POLICY IF EXISTS "Service role inserts audit logs" ON public.audit_logs;
CREATE POLICY "Only service role inserts audit logs"
  ON public.audit_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);
