CREATE OR REPLACE VIEW public.announcement_with_details AS
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