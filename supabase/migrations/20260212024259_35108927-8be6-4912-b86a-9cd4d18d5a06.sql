-- The search_users_paginated was already dropped and recreated in previous migration
-- Just need to handle the super admin assignment and settings table

-- Assign super admin to hayatamr9608@gmail.com (insert if not exists)
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'hayatamr9608@gmail.com';
  IF v_user_id IS NOT NULL THEN
    -- Check if already has super_admin role
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id AND role = 'super_admin') THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'super_admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
    -- Update profile role field
    UPDATE public.profiles SET role = 'super_admin' WHERE user_id = v_user_id;
  END IF;
END $$;

-- Update protect_super_admins trigger to include hayatamr9608@gmail.com
CREATE OR REPLACE FUNCTION public.protect_super_admins()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  protected_email TEXT;
BEGIN
  SELECT email INTO protected_email FROM auth.users WHERE id = OLD.user_id;
  IF protected_email IN ('abdul.salam.bt.2024@miet.ac.in', 'hayatamr9608@gmail.com') AND OLD.role = 'super_admin' THEN
    RAISE EXCEPTION 'Cannot modify protected super admin roles';
  END IF;
  RETURN OLD;
END;
$$;

-- Create user_settings table for persisting notification/privacy preferences
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_posts BOOLEAN DEFAULT true,
  notification_events BOOLEAN DEFAULT true,
  notification_tasks BOOLEAN DEFAULT true,
  notification_achievements BOOLEAN DEFAULT true,
  notification_chat BOOLEAN DEFAULT true,
  notification_announcements BOOLEAN DEFAULT true,
  privacy_profile_visible BOOLEAN DEFAULT true,
  privacy_show_email BOOLEAN DEFAULT false,
  privacy_show_activity BOOLEAN DEFAULT true,
  privacy_show_online_status BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id);