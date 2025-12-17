-- Create the unified community chat room with a proper UUID
-- Using a well-known UUID for the community chat room
INSERT INTO public.chat_rooms (id, name, is_group, is_private, created_by)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  'PARIVARTAN Community',
  true,
  false,
  (SELECT user_id FROM profiles LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM public.chat_rooms WHERE id = '00000000-0000-0000-0000-000000000001'::uuid
);

-- Function to auto-add non-viewers to the community chat
CREATE OR REPLACE FUNCTION public.add_user_to_community_chat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Add user to community chat if they are member, admin, or super_admin
  IF NEW.role IN ('member', 'admin', 'super_admin') THEN
    INSERT INTO public.chat_participants (room_id, user_id)
    VALUES ('00000000-0000-0000-0000-000000000001'::uuid, NEW.user_id)
    ON CONFLICT (room_id, user_id) DO NOTHING;
  END IF;
  
  -- If demoted to viewer, remove from community chat
  IF NEW.role = 'viewer' THEN
    DELETE FROM public.chat_participants 
    WHERE room_id = '00000000-0000-0000-0000-000000000001'::uuid 
    AND user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-manage community chat participants
DROP TRIGGER IF EXISTS on_role_change_manage_chat ON public.user_roles;
CREATE TRIGGER on_role_change_manage_chat
  AFTER INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.add_user_to_community_chat();

-- Add all existing non-viewers to the community chat
INSERT INTO public.chat_participants (room_id, user_id)
SELECT '00000000-0000-0000-0000-000000000001'::uuid, ur.user_id
FROM public.user_roles ur
WHERE ur.role IN ('member', 'admin', 'super_admin')
ON CONFLICT (room_id, user_id) DO NOTHING;

-- Add unique constraint on chat_participants if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chat_participants_room_user_unique'
  ) THEN
    ALTER TABLE public.chat_participants 
    ADD CONSTRAINT chat_participants_room_user_unique UNIQUE (room_id, user_id);
  END IF;
EXCEPTION WHEN others THEN
  -- Constraint might already exist
  NULL;
END $$;