-- Tightens who may write what on FAQs. Through the Supabase REST API:
--   1. faq_comments.is_staff was whatever the client sent, so a student
--      could post a reply shown as "Staff".
--   2. faq_tag and faq_attachment let any signed-in user add/remove links on
--      any FAQ (WITH CHECK (true) / USING (true)).
--   3. A student could set status / answered_by_id on their own FAQ, or
--      create one that is already RESOLVED.
--
-- The live database's policies on these tables don't all match the earlier
-- migrations by name, so every existing policy on faq_comments, faq_tag and
-- faq_attachment is dropped and recreated here.

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('faq_comments', 'faq_tag', 'faq_attachment')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;


-- True when the caller asked this FAQ or is staff. SECURITY DEFINER because
-- signed-in users can no longer read faqs.creator_id themselves
-- (see 20261118120000_hide_anonymous_faq_authors.sql).
CREATE OR REPLACE FUNCTION public.can_manage_faq(p_faq_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.faqs f
    WHERE f.id = p_faq_id
      AND (f.creator_id = auth.uid() OR public.is_admin())
  );
$$;

REVOKE ALL ON FUNCTION public.can_manage_faq(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_faq(UUID) TO authenticated;


-- faq_comments: is_staff must match the author's real role
CREATE POLICY "Signed-in users can read FAQ comments"
  ON public.faq_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users post comments as themselves with their real role"
  ON public.faq_comments FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid() AND is_staff = public.is_admin());

CREATE POLICY "Authors and staff can edit comments"
  ON public.faq_comments FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid() OR public.is_admin())
  WITH CHECK (
    public.is_admin()
    OR (author_id = auth.uid() AND is_staff = false)
  );

CREATE POLICY "Authors and staff can delete comments"
  ON public.faq_comments FOR DELETE
  TO authenticated
  USING (author_id = auth.uid() OR public.is_admin());


-- faq_tag / faq_attachment: only the FAQ's asker or staff change the links
CREATE POLICY "Signed-in users can read FAQ tags"
  ON public.faq_tag FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Asker and staff can add FAQ tags"
  ON public.faq_tag FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_faq(faq_id));

CREATE POLICY "Asker and staff can remove FAQ tags"
  ON public.faq_tag FOR DELETE
  TO authenticated
  USING (public.can_manage_faq(faq_id));

CREATE POLICY "Signed-in users can read FAQ attachments"
  ON public.faq_attachment FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Asker and staff can add FAQ attachments"
  ON public.faq_attachment FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_faq(faq_id));

CREATE POLICY "Asker and staff can remove FAQ attachments"
  ON public.faq_attachment FOR DELETE
  TO authenticated
  USING (public.can_manage_faq(faq_id));

REVOKE ALL ON public.faq_comments, public.faq_tag, public.faq_attachment FROM anon;


-- faqs: only staff decide status and who answered. For anyone else a new
-- FAQ always starts UNANSWERED, and an edit keeps the old values.
CREATE OR REPLACE FUNCTION public.protect_faq_staff_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- No auth.uid() means the SQL Editor / service role, not an app user
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := 'UNANSWERED';
    NEW.answered_by_id := NULL;
  ELSE
    NEW.status := OLD.status;
    NEW.answered_by_id := OLD.answered_by_id;
    NEW.creator_id := OLD.creator_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_faqs_protect_staff_fields ON public.faqs;
CREATE TRIGGER tr_faqs_protect_staff_fields
  BEFORE INSERT OR UPDATE ON public.faqs
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_faq_staff_fields();
