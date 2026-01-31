-- Add biometric credentials table for WebAuthn
CREATE TABLE IF NOT EXISTS public.user_biometric (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  device_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(user_id, credential_id)
);

-- Enable RLS
ALTER TABLE public.user_biometric ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own biometric credentials
CREATE POLICY "Users can view their own biometric credentials" ON public.user_biometric
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own biometric credentials" ON public.user_biometric
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own biometric credentials" ON public.user_biometric
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own biometric credentials" ON public.user_biometric
  FOR DELETE USING (auth.uid() = user_id);