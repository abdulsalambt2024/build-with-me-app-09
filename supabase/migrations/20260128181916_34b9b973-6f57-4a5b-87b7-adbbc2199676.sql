-- Create an atomic, permission-checked role setter to avoid duplicate key errors
-- and to keep exactly one active role per user.

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
BEGIN
  IF acting_user_id IS NULL OR target_user_id IS NULL OR new_role IS NULL THEN
    RAISE EXCEPTION 'Missing required fields';
  END IF;

  -- Only admins/super_admins can change roles
  IF NOT (public.has_role(acting_user_id, 'admin') OR public.has_role(acting_user_id, 'super_admin')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  -- Only super_admins can assign super_admin
  IF new_role = 'super_admin' AND NOT public.has_role(acting_user_id, 'super_admin') THEN
    RAISE EXCEPTION 'Forbidden: Only super admins can assign super_admin';
  END IF;

  -- Prevent non-super-admins from modifying existing super_admin roles
  IF public.has_role(target_user_id, 'super_admin') AND NOT public.has_role(acting_user_id, 'super_admin') THEN
    RAISE EXCEPTION 'Forbidden: Only Super Admins can modify Super Admin roles';
  END IF;

  -- Protect specific super admins (mirrors protect_super_admins() intent)
  IF public.has_role(target_user_id, 'super_admin') AND EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = target_user_id
      AND email IN ('abdul.salam.bt.2024@miet.ac.in', 'hayatamr9608@gmail.com')
  ) THEN
    RAISE EXCEPTION 'Cannot modify protected super admin roles';
  END IF;

  -- Keep exactly one active role per user
  DELETE FROM public.user_roles
  WHERE user_id = target_user_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, new_role);
END;
$$;

-- Prevent direct client-side invocation (security)
REVOKE ALL ON FUNCTION public.set_user_role_atomic(uuid, uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_user_role_atomic(uuid, uuid, public.app_role) TO service_role;
