CREATE TABLE IF NOT EXISTS public.attachment (
  id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.profile(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  filesize BIGINT NOT NULL CHECK (filesize >= 0),
  url TEXT NOT NULL CHECK (url <> ''),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.attachment REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attachment;

------------------------------------------------------------------------------------

ALTER TABLE public.attachment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments"
  ON public.attachment FOR SELECT
  USING (TRUE);

CREATE POLICY "Creator and admin can insert attachments"
  ON public.attachment FOR INSERT
  WITH CHECK (creator_id = auth.uid() OR public.is_admin());

CREATE POLICY "Creator and admin can update attachments"
  ON public.attachment FOR UPDATE
  USING (creator_id = auth.uid() OR public.is_admin())
  WITH CHECK (creator_id = auth.uid() OR public.is_admin());

CREATE POLICY "Creator and admin can delete attachments"
  ON public.attachment FOR DELETE
  USING (creator_id = auth.uid() OR public.is_admin());

------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_attachment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER on_attachment_before_update
  BEFORE UPDATE ON public.attachment
  FOR EACH ROW
  EXECUTE FUNCTION public.update_attachment_timestamp();
