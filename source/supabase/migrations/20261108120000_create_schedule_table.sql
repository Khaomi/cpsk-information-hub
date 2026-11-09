CREATE TABLE IF NOT EXISTS public.schedule (
  id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (btrim(title) <> ''),
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL, 
  location TEXT NOT NULL CHECK (btrim(location) <> ''),
  description TEXT,

  creator_id UUID DEFAULT auth.uid() REFERENCES public.profile(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS schedule_event_date_idx ON public.schedule (event_date, start_time);

ALTER TABLE public.schedule REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.schedule;


ALTER TABLE public.schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can view schedules"
  ON public.schedule FOR SELECT
  TO authenticated
  USING (TRUE);


CREATE POLICY "Staff can insert schedules"
  ON public.schedule FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() AND creator_id = auth.uid());

CREATE POLICY "Staff can update schedules"
  ON public.schedule FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Staff can delete schedules"
  ON public.schedule FOR DELETE
  TO authenticated
  USING (public.is_admin());


GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule TO authenticated;

CREATE OR REPLACE FUNCTION public.update_schedule_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.creator_id = OLD.creator_id;
  NEW.created_at = OLD.created_at;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

REVOKE ALL ON FUNCTION public.update_schedule_timestamp() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE TRIGGER on_schedule_before_update
  BEFORE UPDATE ON public.schedule
  FOR EACH ROW
  EXECUTE FUNCTION public.update_schedule_timestamp();


CREATE TABLE IF NOT EXISTS public.schedule_tag (
  schedule_id UUID NOT NULL REFERENCES public.schedule(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tag(id) ON DELETE CASCADE,
  PRIMARY KEY (schedule_id, tag_id)
);

CREATE INDEX IF NOT EXISTS schedule_tag_tag_id_idx ON public.schedule_tag (tag_id);

ALTER TABLE public.schedule_tag REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.schedule_tag;


ALTER TABLE public.schedule_tag ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can view schedule tag links"
  ON public.schedule_tag FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Staff can manage schedule tag links"
  ON public.schedule_tag FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_tag TO authenticated;
