-- Same fix as 20261109120000_secure_announcement_view_and_drafts.sql, for
-- resource links. Through the Supabase REST API:
--   1. resource_link_with_details exposed every author's email (author_email)
--      and, as a non-security_invoker view, ignored RLS entirely.
--   2. The resource_link SELECT policy was USING (true), so drafts were
--      readable by anyone (even signed out); the UI only hid them.
--   3. The INSERT policy let any signed-in user (students included) create
--      resource links for themselves; only staff should.


-- Drafts (same rule as the view's DRAFT status) are visible only to their
-- creator and to staff; everything else stays visible to signed-in users.
DROP POLICY IF EXISTS "Users can view resource links" ON public.resource_link;
DROP POLICY IF EXISTS "Published resource links are visible, drafts are private" ON public.resource_link;

CREATE POLICY "Published resource links are visible, drafts are private"
  ON public.resource_link FOR SELECT
  TO authenticated
  USING (
    NOT (
      (starts_at IS NULL AND ends_at IS NULL)
      OR (starts_at IS NOT NULL AND CURRENT_DATE < starts_at::DATE)
    )
    OR creator_id = auth.uid()
    OR public.is_admin()
  );

-- Only staff create resource links
DROP POLICY IF EXISTS "Creator and admin can insert resource links" ON public.resource_link;
DROP POLICY IF EXISTS "Staff can insert resource links" ON public.resource_link;

CREATE POLICY "Staff can insert resource links"
  ON public.resource_link FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() AND creator_id = auth.uid());

-- The whole app requires sign-in, so signed-out API calls get nothing
REVOKE ALL ON public.resource_link FROM anon;
REVOKE ALL ON public.resource_link_tag FROM anon;


-- security_invoker makes the view run with the caller's rights, so the
-- policy above applies to it. Author name comes from get_author_name()
-- (from the announcement migration) instead of joining auth.users, and the
-- email is gone. author_id is kept (same value as creator_id) so existing
-- types still match. Dropping a column needs DROP + CREATE.
DROP VIEW IF EXISTS public.resource_link_with_details;

CREATE VIEW public.resource_link_with_details
WITH (security_invoker = true) AS
SELECT
  rl.id,
  rl.title,
  rl.url,
  rl.creator_id,
  rl.creator_id AS author_id,
  public.get_author_name(rl.creator_id) AS author_name,
  rl.starts_at,
  rl.ends_at,
  rl.draft_starts_at,
  rl.draft_ends_at,
  rl.created_at,
  rl.updated_at,
  CASE
    WHEN rl.starts_at IS NULL AND rl.ends_at IS NULL THEN 'DRAFT'
    WHEN rl.starts_at IS NOT NULL AND CURRENT_DATE < rl.starts_at::DATE THEN 'DRAFT'
    WHEN rl.ends_at IS NOT NULL AND CURRENT_DATE > rl.ends_at::DATE THEN 'ARCHIVED'
    ELSE 'ACTIVE'
  END AS status
FROM public.resource_link rl;

REVOKE ALL ON public.resource_link_with_details FROM PUBLIC, anon;
GRANT SELECT ON public.resource_link_with_details TO authenticated;

NOTIFY pgrst, 'reload schema';
