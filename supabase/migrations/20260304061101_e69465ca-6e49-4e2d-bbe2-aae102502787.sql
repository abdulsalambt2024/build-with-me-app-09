
-- Table for PARI rotating comments managed by super admins
CREATE TABLE public.pari_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pari_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active pari comments"
  ON public.pari_comments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Super admins can manage pari comments"
  ON public.pari_comments FOR ALL
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Insert default comment
INSERT INTO public.pari_comments (message, display_order, is_active, created_by)
VALUES ('How can I Help You? 💬', 0, true, '00000000-0000-0000-0000-000000000000');
