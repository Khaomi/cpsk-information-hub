-- Fixes two leaks in announcements, both readable through the API without
-- signing in (the proxy only guards pages, not the Supabase REST API):
--   1. announcement_with_details exposed every author's email (author_email)
--      and, as a non-security_invoker view, ignored RLS entirely.
--   2. The announcement SELECT policy was USING (TRUE), so drafts were
--      readable by anyone; the UI only hid them.


-- Author display name without exposing auth.users. SECURITY DEFINER so an
-- invoker view can show names it otherwise has no right to read; returns
-- only the name, never the email itself.
CREATE OR REPLACE FUNCTION public.get_author_name(p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    u.raw_user_meta_data->>'display_name',
    u.raw_user_meta_data->>'full_name',
    split_part(u.email, '@', 1)
  )
  FROM auth.users u
  WHERE u.id = p_user_id;
$$;

REVOKE ALL ON FUNCTION public.get_author_name(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_author_name(UUID) TO anon, authenticated;


-- Drafts (same rule as the view's DRAFT status) are visible only to their
-- creator and to staff; everything else stays visible to everyone.
DROP POLICY IF EXISTS "Users can view announcements" ON public.announcement;
DROP POLICY IF EXISTS "Published announcements are public, drafts are private" ON public.announcement;

CREATE POLICY "Published announcements are public, drafts are private"
  ON public.announcement FOR SELECT
  USING (
    NOT (
      (starts_at IS NULL AND ends_at IS NULL)
      OR (starts_at IS NOT NULL AND CURRENT_DATE < starts_at::DATE)
    )
    OR creator_id = auth.uid()
    OR public.is_admin()
  );


-- Dropping a column from a view needs DROP + CREATE. security_invoker makes
-- the view run with the caller's rights, so the policy above applies to it.
-- author_id is kept (same value as creator_id) so existing types still match.
DROP VIEW IF EXISTS public.announcement_with_details;

CREATE VIEW public.announcement_with_details
WITH (security_invoker = true) AS
SELECT
  a.id,
  a.title,
  a.body,
  a.creator_id,
  a.creator_id AS author_id,
  public.get_author_name(a.creator_id) AS author_name,
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
FROM public.announcement a;

GRANT SELECT ON public.announcement_with_details TO anon, authenticated;
