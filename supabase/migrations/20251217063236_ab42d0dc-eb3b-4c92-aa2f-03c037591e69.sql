-- Add is_pinned column to posts for admin pinning feature
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS pinned_at timestamp with time zone;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS pinned_by uuid;

-- Add is_pinned to announcements as well
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS pinned_at timestamp with time zone;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS pinned_by uuid;

-- Create index for faster pinned posts queries
CREATE INDEX IF NOT EXISTS idx_posts_pinned ON public.posts (is_pinned, pinned_at DESC) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON public.announcements (is_pinned, pinned_at DESC) WHERE is_pinned = true;