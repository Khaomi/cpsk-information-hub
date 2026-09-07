CREATE TABLE IF NOT EXISTS public.announcement (
  id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  creator_id UUID NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at >= starts_at)
);

CREATE TABLE IF NOT EXISTS public.announcement_attachment (
  announcement_id UUID NOT NULL REFERENCES public.announcement(id) ON DELETE CASCADE,
  attachment_id UUID NOT NULL REFERENCES public.attachment(id) ON DELETE CASCADE,
  PRIMARY KEY (announcement_id, attachment_id)
);

ALTER TABLE public.announcement_attachment REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_attachment;

CREATE TABLE IF NOT EXISTS public.announcement_tag (
  announcement_id UUID NOT NULL REFERENCES public.announcement(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tag(id) ON DELETE CASCADE,
  PRIMARY KEY (announcement_id, tag_id)
);

ALTER TABLE public.announcement REPLICA IDENTITY FULL;
ALTER TABLE public.announcement_tag REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_tag;

------------------------------------------------------------------------------------

ALTER TABLE public.announcement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_attachment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_tag ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view announcements"
  ON public.announcement FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can view announcement links"
  ON public.announcement_attachment FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can view announcement tag links"
  ON public.announcement_tag FOR SELECT
  USING (TRUE);

CREATE POLICY "Creator and admin can insert announcements"
  ON public.announcement FOR INSERT
  WITH CHECK (creator_id = auth.uid() OR public.is_admin());

CREATE POLICY "Creator and admin can update announcements"
  ON public.announcement FOR UPDATE
  USING (creator_id = auth.uid() OR public.is_admin())
  WITH CHECK (creator_id = auth.uid() OR public.is_admin());

CREATE POLICY "Creator and admin can delete announcements"
  ON public.announcement FOR DELETE
  USING (creator_id = auth.uid() OR public.is_admin());

CREATE POLICY "Creator and admin can manage announcement attachments"
  ON public.announcement_attachment FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.announcement a
      WHERE a.id = announcement_id
        AND (a.creator_id = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.announcement a
      WHERE a.id = announcement_id
        AND (a.creator_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Creator and admin can manage announcement tags"
  ON public.announcement_tag FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.announcement a
      WHERE a.id = announcement_id
        AND (a.creator_id = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.announcement a
      WHERE a.id = announcement_id
        AND (a.creator_id = auth.uid() OR public.is_admin())
    )
  );

------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_announcement_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.update_announcement_timestamp() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE TRIGGER on_announcement_before_update
  BEFORE UPDATE ON public.announcement
  FOR EACH ROW
  EXECUTE FUNCTION public.update_announcement_timestamp();
