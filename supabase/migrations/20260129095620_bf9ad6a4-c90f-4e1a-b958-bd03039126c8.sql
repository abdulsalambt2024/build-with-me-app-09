-- 1. Add PPIN (4-digit PIN) table for user security
CREATE TABLE IF NOT EXISTS public.user_ppin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  ppin_hash TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  use_for_login BOOLEAN NOT NULL DEFAULT false,
  use_for_sensitive_actions BOOLEAN NOT NULL DEFAULT false,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_ppin ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own PPIN settings"
  ON public.user_ppin FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own PPIN"
  ON public.user_ppin FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own PPIN"
  ON public.user_ppin FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 2. Audit logs table for comprehensive tracking
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_target ON public.audit_logs(target_type, target_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action_type);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins/super_admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'super_admin')
  );

-- Service role inserts audit logs
CREATE POLICY "Service role inserts audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. Add soft delete (is_disabled) to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS disabled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS disabled_reason TEXT;

-- 4. Function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_actor_id UUID,
  p_action_type TEXT,
  p_target_type TEXT,
  p_target_id TEXT DEFAULT NULL,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    actor_id, action_type, target_type, target_id, 
    old_value, new_value, metadata
  )
  VALUES (
    p_actor_id, p_action_type, p_target_type, p_target_id,
    p_old_value, p_new_value, p_metadata
  )
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- 5. Update set_user_role_atomic to log audit events
CREATE OR REPLACE FUNCTION public.set_user_role_atomic(
  acting_user_id uuid,
  target_user_id uuid,
  new_role public.app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_role public.app_role;
BEGIN
  IF acting_user_id IS NULL OR target_user_id IS NULL OR new_role IS NULL THEN
    RAISE EXCEPTION 'Missing required fields';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(target_user_id::text));

  IF NOT (public.has_role(acting_user_id, 'admin') OR public.has_role(acting_user_id, 'super_admin')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF new_role = 'super_admin' AND NOT public.has_role(acting_user_id, 'super_admin') THEN
    RAISE EXCEPTION 'Forbidden: Only super admins can assign super_admin';
  END IF;

  IF public.has_role(target_user_id, 'super_admin') AND NOT public.has_role(acting_user_id, 'super_admin') THEN
    RAISE EXCEPTION 'Forbidden: Only Super Admins can modify Super Admin roles';
  END IF;

  IF public.has_role(target_user_id, 'super_admin') AND EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = target_user_id
      AND email IN ('abdul.salam.bt.2024@miet.ac.in', 'hayatamr9608@gmail.com')
  ) THEN
    RAISE EXCEPTION 'Cannot modify protected super admin roles';
  END IF;

  -- Get old role for audit
  SELECT role INTO old_role FROM public.user_roles WHERE user_id = target_user_id;

  DELETE FROM public.user_roles WHERE user_id = target_user_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, new_role)
  ON CONFLICT (user_id, role) DO UPDATE SET role = EXCLUDED.role;

  -- Log the role change
  PERFORM public.log_audit_event(
    acting_user_id,
    'role_change',
    'user',
    target_user_id::text,
    jsonb_build_object('role', old_role),
    jsonb_build_object('role', new_role),
    NULL
  );
END;
$$;

-- 6. Function to disable/enable user (soft delete)
CREATE OR REPLACE FUNCTION public.toggle_user_disabled(
  p_actor_id UUID,
  p_target_id UUID,
  p_disable BOOLEAN,
  p_reason TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins/super_admins can disable users
  IF NOT (public.has_role(p_actor_id, 'admin') OR public.has_role(p_actor_id, 'super_admin')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  -- Cannot disable super admins unless you are one
  IF public.has_role(p_target_id, 'super_admin') AND NOT public.has_role(p_actor_id, 'super_admin') THEN
    RAISE EXCEPTION 'Cannot disable Super Admin accounts';
  END IF;

  -- Update profile
  UPDATE public.profiles
  SET 
    is_disabled = p_disable,
    disabled_at = CASE WHEN p_disable THEN now() ELSE NULL END,
    disabled_by = CASE WHEN p_disable THEN p_actor_id ELSE NULL END,
    disabled_reason = CASE WHEN p_disable THEN p_reason ELSE NULL END,
    updated_at = now()
  WHERE user_id = p_target_id;

  -- Log audit event
  PERFORM public.log_audit_event(
    p_actor_id,
    CASE WHEN p_disable THEN 'user_disabled' ELSE 'user_enabled' END,
    'user',
    p_target_id::text,
    NULL,
    jsonb_build_object('reason', p_reason),
    NULL
  );
END;
$$;

-- 7. Add popup pause tracking for super admins
ALTER TABLE public.popups
ADD COLUMN IF NOT EXISTS is_paused BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS paused_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;

-- 8. Server-side user search function with pagination
CREATE OR REPLACE FUNCTION public.search_users_paginated(
  p_search TEXT DEFAULT '',
  p_role_filter TEXT DEFAULT 'all',
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  role TEXT,
  bio TEXT,
  course TEXT,
  branch TEXT,
  roll_number TEXT,
  year TEXT,
  semester TEXT,
  father_name TEXT,
  date_of_birth TEXT,
  is_disabled BOOLEAN,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset INTEGER;
  v_total BIGINT;
BEGIN
  v_offset := (p_page - 1) * p_page_size;
  
  -- Get total count
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
$$;

GRANT EXECUTE ON FUNCTION public.search_users_paginated TO authenticated;