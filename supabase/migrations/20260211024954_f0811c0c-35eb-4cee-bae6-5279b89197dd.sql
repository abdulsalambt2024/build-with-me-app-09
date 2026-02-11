
-- =========================================
-- FIX RLS: Remove duplicate/conflicting policies and create clean ones
-- =========================================

-- PROFILES: Remove duplicate restrictive policies, keep admin-friendly ones
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_super_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_super_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_super_admin" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view limited profile data" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Profiles: All authenticated can SELECT (needed for user lists, chat names, etc)
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Profiles: Users can insert their own
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Profiles: Users can update their own
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Profiles: Super admins can update any profile
CREATE POLICY "profiles_update_super_admin"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'));

-- Profiles: Super admins can delete
CREATE POLICY "profiles_delete_super_admin"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'));

-- USER_ROLES: Allow admins to read all roles (needed for user management)
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_super_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_super_admin" ON public.user_roles;

-- All authenticated can view roles (needed for role badges, user lists)
CREATE POLICY "user_roles_select_authenticated"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

-- Super admins can update roles
CREATE POLICY "user_roles_update_super_admin"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'));

-- POSTS: Remove duplicate/conflicting policies
DROP POLICY IF EXISTS "posts_select_own_or_super" ON public.posts;
DROP POLICY IF EXISTS "posts_insert_own" ON public.posts;
DROP POLICY IF EXISTS "posts_update_own_or_super" ON public.posts;
DROP POLICY IF EXISTS "posts_delete_own_or_super" ON public.posts;
-- Keep: "Authenticated users can view posts", "Members can create posts", "Users can delete their own posts", "Users can update their own posts", "Admins can delete any post"

-- VERIFICATION_BADGES: Remove duplicate policies
DROP POLICY IF EXISTS "verification_badges_insert_own" ON public.verification_badges;
DROP POLICY IF EXISTS "verification_badges_select_own_or_super" ON public.verification_badges;
-- Keep: "Everyone can view badges", "Super admins can manage all badges" or "Super admins can manage badges"
DROP POLICY IF EXISTS "Super admins can manage badges" ON public.verification_badges;

-- TASKS: Remove duplicate policies
DROP POLICY IF EXISTS "tasks_delete_admin" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_admin" ON public.tasks;
DROP POLICY IF EXISTS "tasks_select_assigned_or_admin" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_admin_or_assigned" ON public.tasks;
-- Keep: "Admins can create tasks", "Admins can delete tasks", "Admins can update any task", "Admins can view all tasks", "Users can update their task status", "Users can view their assigned tasks"

-- Restore the deleted post by Abdul Salam
INSERT INTO public.posts (user_id, title, content, media_urls)
SELECT 
  '0cc62fdc-6a32-4b09-a9c9-1a29cbc194d2',
  'Sunday Village Visit.',
  'Parivartan in action: teaching today for a better tomorrow.',
  ARRAY[
    'https://hbkptilrqqsqjlkabpbe.supabase.co/storage/v1/object/public/post-media/pdl98p9yx_1770629148762.jpg',
    'https://hbkptilrqqsqjlkabpbe.supabase.co/storage/v1/object/public/post-media/9z6et6at8_1770629151057.jpg',
    'https://hbkptilrqqsqjlkabpbe.supabase.co/storage/v1/object/public/post-media/ypar5vqw3_1770629152852.jpg',
    'https://hbkptilrqqsqjlkabpbe.supabase.co/storage/v1/object/public/post-media/eracbvqe7_1770629156108.jpg',
    'https://hbkptilrqqsqjlkabpbe.supabase.co/storage/v1/object/public/post-media/lideqro6p_1770629158010.jpg',
    'https://hbkptilrqqsqjlkabpbe.supabase.co/storage/v1/object/public/post-media/yrm0ynh1i_1770629159470.jpg',
    'https://hbkptilrqqsqjlkabpbe.supabase.co/storage/v1/object/public/post-media/dup65i1ne_1770629161148.jpg'
  ]
WHERE NOT EXISTS (
  SELECT 1 FROM public.posts WHERE title = 'Sunday Village Visit.' AND user_id = '0cc62fdc-6a32-4b09-a9c9-1a29cbc194d2'
);
