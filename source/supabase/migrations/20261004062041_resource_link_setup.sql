-- 1. Base tables, mirroring announcement/announcement_tag (no attachment link needed)
CREATE TABLE public.resource_link (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  url text NOT NULL CHECK (url <> ''::text),
  creator_id uuid NOT NULL,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  draft_starts_at timestamp with time zone,
  draft_ends_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT resource_link_pkey PRIMARY KEY (id),
  CONSTRAINT resource_link_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profile(id)
);

CREATE TABLE public.resource_link_tag (
  resource_link_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  CONSTRAINT resource_link_tag_pkey PRIMARY KEY (resource_link_id, tag_id),
  CONSTRAINT resource_link_tag_resource_link_id_fkey FOREIGN KEY (resource_link_id) REFERENCES public.resource_link(id),
  CONSTRAINT resource_link_tag_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tag(id)
);

-- 2. RLS, exact mirror of announcement/announcement_tag's policies
ALTER TABLE public.resource_link ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_link_tag ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view resource links"
  ON public.resource_link FOR SELECT
  USING (true);

CREATE POLICY "Creator and admin can insert resource links"
  ON public.resource_link FOR INSERT
  WITH CHECK (creator_id = auth.uid() OR is_admin());

CREATE POLICY "Creator and admin can update resource links"
  ON public.resource_link FOR UPDATE
  USING (creator_id = auth.uid() OR is_admin())
  WITH CHECK (creator_id = auth.uid() OR is_admin());

CREATE POLICY "Creator and admin can delete resource links"
  ON public.resource_link FOR DELETE
  USING (creator_id = auth.uid() OR is_admin());

CREATE POLICY "Users can view resource link tag links"
  ON public.resource_link_tag FOR SELECT
  USING (true);

CREATE POLICY "Creator and admin can manage resource link tags"
  ON public.resource_link_tag FOR ALL
  USING (EXISTS (
    SELECT 1 FROM resource_link rl
    WHERE rl.id = resource_link_tag.resource_link_id
      AND (rl.creator_id = auth.uid() OR is_admin())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM resource_link rl
    WHERE rl.id = resource_link_tag.resource_link_id
      AND (rl.creator_id = auth.uid() OR is_admin())
  ));

-- 3. View, exact mirror of announcement_with_details's status logic
CREATE VIEW public.resource_link_with_details AS
SELECT rl.id,
    rl.title,
    rl.url,
    rl.creator_id,
    p.id AS author_id,
    COALESCE(u.raw_user_meta_data ->> 'display_name'::text, u.raw_user_meta_data ->> 'full_name'::text, split_part(u.email::text, '@'::text, 1)) AS author_name,
    u.email AS author_email,
    rl.starts_at,
    rl.ends_at,
    rl.draft_starts_at,
    rl.draft_ends_at,
    rl.created_at,
    rl.updated_at,
        CASE
            WHEN rl.starts_at IS NULL AND rl.ends_at IS NULL THEN 'DRAFT'::text
            WHEN rl.starts_at IS NOT NULL AND CURRENT_DATE < rl.starts_at::date THEN 'DRAFT'::text
            WHEN rl.ends_at IS NOT NULL AND CURRENT_DATE > rl.ends_at::date THEN 'ARCHIVED'::text
            ELSE 'ACTIVE'::text
        END AS status
   FROM resource_link rl
     LEFT JOIN profile p ON p.id = rl.creator_id
     LEFT JOIN auth.users u ON u.id = rl.creator_id;

-- 4. Realtime, so subscribeToResourceLinks works the same way subscribeToAnnouncements does
ALTER TABLE public.resource_link REPLICA IDENTITY FULL;
ALTER TABLE public.resource_link_tag REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.resource_link;
ALTER PUBLICATION supabase_realtime ADD TABLE public.resource_link_tag;

-- 5. Base table grants for the `authenticated` and `anon` roles.
-- Without these, RLS policies above are never even reached — Postgres
-- checks base table privileges first, and these were missing originally,
-- causing a `permission denied for table resource_link` (42501) error
-- on every insert attempt despite correct RLS policies.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.resource_link TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.resource_link_tag TO authenticated;
GRANT SELECT ON TABLE public.resource_link_with_details TO authenticated;

GRANT SELECT ON TABLE public.resource_link TO anon;
GRANT SELECT ON TABLE public.resource_link_tag TO anon;
GRANT SELECT ON TABLE public.resource_link_with_details TO anon;