
-- Fix duplicate roles for hayatamr9608@gmail.com
DELETE FROM public.user_roles 
WHERE user_id = 'f5bd3516-309b-478f-b0ff-1e6557647b72' 
AND role != 'super_admin';

-- Clean orphaned achievements
DELETE FROM public.achievements 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Add foreign key on achievements.user_id -> auth.users(id)
ALTER TABLE public.achievements 
ADD CONSTRAINT achievements_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Reset 2FA for Abdul Salam so he can re-setup
DELETE FROM public.user_2fa 
WHERE user_id = '0cc62fdc-6a32-4b09-a9c9-1a29cbc194d2';
