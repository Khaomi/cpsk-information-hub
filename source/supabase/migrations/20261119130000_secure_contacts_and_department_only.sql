-- Contacts, following 20261119120000_public_access_and_department_only.sql.
--
-- The contact tables were created outside the migrations (in the dashboard),
-- and their live policies, checked with pg_policies on 2026-11-19, were:
--   - contact SELECT for {public} USING (true), twice: anyone, signed in or
--     not, could read every contact through the API, drafts included.
--   - contact INSERT / UPDATE / DELETE for {authenticated} with (true): any
--     signed-in user, students included, could create, change or delete any
--     contact.
--   - contact_tag and contact_attachment FOR ALL for {authenticated} with
--     (true), twice each: same for a contact's tags and image.
-- All of those are dropped and replaced:
--   - staff (is_admin()) create, change and delete contacts and their links
--   - signed-in users read every contact except other people's drafts
--   - guests read ACTIVE contacts whose department_only is false
-- department_only defaults to TRUE, like the other content types.

ALTER TABLE public.contact ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_tag ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_attachment ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('contact', 'contact_tag', 'contact_attachment')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

ALTER TABLE public.contact
  ADD COLUMN IF NOT EXISTS department_only BOOLEAN NOT NULL DEFAULT TRUE;


-- contact
CREATE POLICY "Signed-in users see contacts, drafts only their own"
  ON public.contact FOR SELECT
  TO authenticated
  USING (status <> 'DRAFT' OR creator_id = auth.uid() OR public.is_admin());

CREATE POLICY "Guests see active public contacts"
  ON public.contact FOR SELECT
  TO anon
  USING (status = 'ACTIVE' AND NOT department_only);

CREATE POLICY "Staff can insert contacts"
  ON public.contact FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() AND creator_id = auth.uid());

CREATE POLICY "Staff can update contacts"
  ON public.contact FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Staff can delete contacts"
  ON public.contact FOR DELETE
  TO authenticated
  USING (public.is_admin());


-- contact_tag / contact_attachment: readable exactly when their contact is
-- (the subquery runs under the caller's own policies on contact), managed by
-- staff only.
CREATE POLICY "Contact tag links follow their contact"
  ON public.contact_tag FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.contact c
    WHERE c.id = contact_tag.contact_id
  ));

CREATE POLICY "Staff can insert contact tag links"
  ON public.contact_tag FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Staff can delete contact tag links"
  ON public.contact_tag FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Contact image links follow their contact"
  ON public.contact_attachment FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.contact c
    WHERE c.id = contact_attachment.contact_id
  ));

CREATE POLICY "Staff can insert contact image links"
  ON public.contact_attachment FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Staff can delete contact image links"
  ON public.contact_attachment FOR DELETE
  TO authenticated
  USING (public.is_admin());


-- Recreated as security_invoker so the policies above apply to it. Same
-- columns as before (they match the contact table one to one, see
-- types/database.types.ts), plus department_only.
DROP VIEW IF EXISTS public.contact_with_details;

CREATE VIEW public.contact_with_details
WITH (security_invoker = true) AS
SELECT
  c.id,
  c.name,
  c.role_type,
  c.email,
  c.building,
  c.room,
  c.other_contact,
  c.bio,
  c.status,
  c.creator_id,
  c.created_at,
  c.updated_at,
  c.department_only
FROM public.contact c;

REVOKE ALL ON public.contact_with_details FROM PUBLIC;
GRANT SELECT ON public.contact_with_details TO anon, authenticated;

GRANT SELECT ON public.contact, public.contact_tag, public.contact_attachment TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact, public.contact_tag, public.contact_attachment TO authenticated;


-- Guests may now also see images of contacts they can see.
DROP POLICY IF EXISTS "Guests see attachments of items they can see" ON public.attachment;

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
    OR EXISTS (
      SELECT 1 FROM public.contact_attachment ca
      WHERE ca.attachment_id = attachment.id
    )
  );


NOTIFY pgrst, 'reload schema';
