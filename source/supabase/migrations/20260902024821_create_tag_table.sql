CREATE TYPE public.tag_category AS ENUM ('year', 'course', 'activity');

CREATE TABLE IF NOT EXISTS public.tag (
  id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category public.tag_category,
  creator_id UUID REFERENCES public.profile(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tag REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tag;

------------------------------------------------------------------------------------

ALTER TABLE public.tag ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tags"
  ON public.tag FOR SELECT
  USING (TRUE);

CREATE POLICY "Creator and admin can insert tags"
  ON public.tag FOR INSERT
  WITH CHECK (creator_id = auth.uid() OR public.is_admin());

CREATE POLICY "Creator and admin can update tags"
  ON public.tag FOR UPDATE
  USING (creator_id = auth.uid() OR public.is_admin())
  WITH CHECK (creator_id = auth.uid() OR public.is_admin());

CREATE POLICY "Creator and admin can delete tags"
  ON public.tag FOR DELETE
  USING (creator_id = auth.uid() OR public.is_admin());

------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_tag_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER on_tag_before_update
  BEFORE UPDATE ON public.tag
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tag_timestamp();