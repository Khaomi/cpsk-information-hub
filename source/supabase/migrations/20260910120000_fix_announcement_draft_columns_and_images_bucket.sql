-- The remote database's migration history recorded 20260902050559,
-- 20260902054337 and 20260909055121 as already applied, but their file
-- content was edited after that run (draft_starts_at/draft_ends_at were
-- added to the table and view, and the announcement-images bucket/policies
-- were added) — so `supabase db push` skipped re-running them and the
-- remote schema never caught up. This migration brings it in line with
-- what those files already declare.

ALTER TABLE public.announcement ADD COLUMN IF NOT EXISTS draft_starts_at TIMESTAMPTZ;
ALTER TABLE public.announcement ADD COLUMN IF NOT EXISTS draft_ends_at TIMESTAMPTZ;

-- CREATE OR REPLACE VIEW can't insert columns in the middle of the column
-- list (draft_starts_at/draft_ends_at land before created_at/updated_at),
-- so the view must be dropped and recreated rather than replaced in place.
DROP VIEW IF EXISTS public.announcement_with_details;

CREATE VIEW public.announcement_with_details AS
SELECT
  a.id,
  a.title,
  a.body,
  a.creator_id,
  p.id AS author_id,
  COALESCE(
    u.raw_user_meta_data->>'display_name',
    u.raw_user_meta_data->>'full_name',
    split_part(u.email, '@', 1)
  ) AS author_name,
  u.email AS author_email,
  a.starts_at,
  a.ends_at,
  a.draft_starts_at,
  a.draft_ends_at,
  a.created_at,
  a.updated_at,
  CASE
    WHEN a.starts_at IS NULL AND a.ends_at IS NULL THEN 'DRAFT'
    WHEN a.starts_at IS NOT NULL AND CURRENT_DATE < a.starts_at::DATE THEN 'DRAFT'
    WHEN a.ends_at IS NOT NULL AND CURRENT_DATE > a.ends_at::DATE THEN 'ARCHIVED'
    ELSE 'ACTIVE'
  END AS status
FROM public.announcement a
LEFT JOIN public.profile p ON p.id = a.creator_id
LEFT JOIN auth.users u ON u.id = a.creator_id;

GRANT SELECT ON public.announcement_with_details TO PUBLIC;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'announcement-images',
  'announcement-images',
  true,
  10485760, -- 10 MB
  ARRAY['image/*']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view announcement images" ON storage.objects;
CREATE POLICY "Anyone can view announcement images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'announcement-images');

DROP POLICY IF EXISTS "Staff can upload announcement images" ON storage.objects;
CREATE POLICY "Staff can upload announcement images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'announcement-images' AND public.is_admin());

DROP POLICY IF EXISTS "Staff can delete announcement images" ON storage.objects;
CREATE POLICY "Staff can delete announcement images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'announcement-images' AND public.is_admin());
