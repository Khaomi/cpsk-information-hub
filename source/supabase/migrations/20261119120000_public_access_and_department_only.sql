-- Opens the site to visitors who aren't signed in, with a per-item
-- "department only" switch. For now, being signed in (any @ku.th or
-- @ku.ac.th account, see 20260902024738_restrict_email.sql) counts as being
-- in the department.
--
-- Guests (the anon role) can now read:
--   - published announcements, resource links, and schedules whose
--     department_only is false, plus those items' tags and images
--   - every FAQ with its tags, images, and replies. Askers stay hidden
--     (see 20261118120000_hide_anonymous_faq_authors.sql)
--   - tags (already readable before this migration)
-- Guests still can't write anything. Contacts get their own migration.
--
-- department_only defaults to TRUE, so existing rows, and anything created
-- without the field, stay hidden from guests until staff untick it.


-- is_admin() was revoked from anon, but some existing policies call it with
-- no role filter (e.g. FOR ALL ... USING (... OR public.is_admin())). Postgres
-- rejects a whole query when a policy uses a function the caller can't
-- execute, so every guest read of those tables would fail. is_admin() only
-- says whether the caller is staff (always false for anon), so letting anon
-- run it exposes nothing.
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;


-- Every existing SELECT policy on these tables is dropped and recreated
-- below. The live database's policy names don't all match the migration
-- files, and a leftover permissive SELECT policy with another name would
-- quietly keep department-only rows readable by guests. FOR ALL policies
-- (creator/staff management) are left as they are.
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND cmd = 'SELECT'
      AND tablename IN (
        'announcement', 'announcement_tag', 'announcement_attachment',
        'resource_link', 'resource_link_tag',
        'schedule', 'schedule_tag',
        'attachment',
        'faq_tag', 'faq_attachment', 'faq_comments'
      )
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;


------------------------------------------------------------------------------
-- Announcements
------------------------------------------------------------------------------

ALTER TABLE public.announcement
  ADD COLUMN IF NOT EXISTS department_only BOOLEAN NOT NULL DEFAULT TRUE;

-- Published = not a draft, same rule as the view's DRAFT status.
CREATE POLICY "Signed-in users see published announcements and their own drafts"
  ON public.announcement FOR SELECT
  TO authenticated
  USING (
    NOT (
      (starts_at IS NULL AND ends_at IS NULL)
      OR (starts_at IS NOT NULL AND CURRENT_DATE < starts_at::DATE)
    )
    OR creator_id = auth.uid()
    OR public.is_admin()
  );

CREATE POLICY "Guests see published public announcements"
  ON public.announcement FOR SELECT
  TO anon
  USING (
    NOT department_only
    AND NOT (
      (starts_at IS NULL AND ends_at IS NULL)
      OR (starts_at IS NOT NULL AND CURRENT_DATE < starts_at::DATE)
    )
  );

-- Any signed-in user (students included) could create announcements through
-- the API, which would now let them post publicly. Same fix as resource
-- links in 20261118130000_secure_resource_link_view_and_drafts.sql.
DROP POLICY IF EXISTS "Creator and admin can insert announcements" ON public.announcement;
DROP POLICY IF EXISTS "Staff can insert announcements" ON public.announcement;

CREATE POLICY "Staff can insert announcements"
  ON public.announcement FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() AND creator_id = auth.uid());

-- Tag and image links are visible exactly when their announcement is. The
-- subquery runs under the caller's own policies on announcement.
CREATE POLICY "Announcement tag links follow their announcement"
  ON public.announcement_tag FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.announcement a
    WHERE a.id = announcement_tag.announcement_id
  ));

CREATE POLICY "Announcement image links follow their announcement"
  ON public.announcement_attachment FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.announcement a
    WHERE a.id = announcement_attachment.announcement_id
  ));

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
  END AS status,
  a.department_only
FROM public.announcement a;

REVOKE ALL ON public.announcement_with_details FROM PUBLIC;
GRANT SELECT ON public.announcement_with_details TO anon, authenticated;

GRANT SELECT ON public.announcement, public.announcement_tag, public.announcement_attachment TO anon;


------------------------------------------------------------------------------
-- Resource links
------------------------------------------------------------------------------

ALTER TABLE public.resource_link
  ADD COLUMN IF NOT EXISTS department_only BOOLEAN NOT NULL DEFAULT TRUE;

CREATE POLICY "Signed-in users see published resource links and their own drafts"
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

CREATE POLICY "Guests see published public resource links"
  ON public.resource_link FOR SELECT
  TO anon
  USING (
    NOT department_only
    AND NOT (
      (starts_at IS NULL AND ends_at IS NULL)
      OR (starts_at IS NOT NULL AND CURRENT_DATE < starts_at::DATE)
    )
  );

CREATE POLICY "Resource link tag links follow their resource link"
  ON public.resource_link_tag FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.resource_link rl
    WHERE rl.id = resource_link_tag.resource_link_id
  ));

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
  END AS status,
  rl.department_only
FROM public.resource_link rl;

REVOKE ALL ON public.resource_link_with_details FROM PUBLIC;
GRANT SELECT ON public.resource_link_with_details TO anon, authenticated;

-- 20261118130000 revoked these from anon; the policies above now decide.
GRANT SELECT ON public.resource_link, public.resource_link_tag TO anon;


------------------------------------------------------------------------------
-- Schedules (no drafts: an event is visible as soon as it exists)
------------------------------------------------------------------------------

ALTER TABLE public.schedule
  ADD COLUMN IF NOT EXISTS department_only BOOLEAN NOT NULL DEFAULT TRUE;

CREATE POLICY "Signed-in users can view schedules"
  ON public.schedule FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Guests see public schedules"
  ON public.schedule FOR SELECT
  TO anon
  USING (NOT department_only);

CREATE POLICY "Schedule tag links follow their schedule"
  ON public.schedule_tag FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.schedule s
    WHERE s.id = schedule_tag.schedule_id
  ));

GRANT SELECT ON public.schedule, public.schedule_tag TO anon;


------------------------------------------------------------------------------
-- FAQs: guests read everything, writes stay signed-in only
------------------------------------------------------------------------------

-- faq_with_details is not security_invoker, and already blanks creator_id,
-- author_role and author_name for anonymous questions when the caller isn't
-- the asker or staff, which is always the case for a guest.
GRANT SELECT ON public.faq_with_details TO anon;

CREATE POLICY "Anyone can read FAQ tags"
  ON public.faq_tag FOR SELECT
  TO anon, authenticated
  USING (TRUE);

CREATE POLICY "Anyone can read FAQ attachments"
  ON public.faq_attachment FOR SELECT
  TO anon, authenticated
  USING (TRUE);

CREATE POLICY "Anyone can read FAQ comments"
  ON public.faq_comments FOR SELECT
  TO anon, authenticated
  USING (TRUE);

GRANT SELECT ON public.faq_tag, public.faq_attachment, public.faq_comments TO anon;


------------------------------------------------------------------------------
-- Attachments (shared by announcements, FAQs, and contacts)
------------------------------------------------------------------------------

CREATE POLICY "Signed-in users can view attachments"
  ON public.attachment FOR SELECT
  TO authenticated
  USING (TRUE);

-- A guest sees an attachment only when it belongs to something the guest can
-- see. Each subquery runs under the guest's own policies on the link table,
-- which in turn follow the parent item. Contact images are added by the
-- contacts migration.
CREATE POLICY "Guests see attachments of items they can see"
  ON public.attachment FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.announcement_attachment aa
      WHERE aa.attachment_id = attachment.id
    )
    OR EXISTS (
      SELECT 1 FROM public.faq_attachment fa
      WHERE fa.attachment_id = attachment.id
    )
  );

GRANT SELECT ON public.attachment TO anon;


NOTIFY pgrst, 'reload schema';
