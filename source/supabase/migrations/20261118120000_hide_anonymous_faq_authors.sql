REVOKE SELECT ON public.faqs FROM anon, authenticated;
GRANT SELECT (id, question, description, status, is_anonymous, answered_by_id, created_at, updated_at)
  ON public.faqs TO authenticated;



DROP VIEW IF EXISTS public.faq_with_details;

CREATE VIEW public.faq_with_details AS
SELECT
  f.id,
  f.question,
  f.description,
  f.status,
  f.is_anonymous,
  CASE WHEN v.can_see_author THEN f.creator_id END AS creator_id,
  f.created_at,
  f.updated_at,
  CASE WHEN v.can_see_author THEN p.role END AS author_role,
  CASE WHEN v.can_see_author THEN public.get_author_name(f.creator_id) END AS author_name
FROM public.faqs f
LEFT JOIN public.profile p ON p.id = f.creator_id
CROSS JOIN LATERAL (
  SELECT (
    NOT f.is_anonymous
    OR f.creator_id = auth.uid()
    OR public.is_admin()
  ) AS can_see_author
) v;

REVOKE ALL ON public.faq_with_details FROM PUBLIC, anon;
GRANT SELECT ON public.faq_with_details TO authenticated;

NOTIFY pgrst, 'reload schema';
