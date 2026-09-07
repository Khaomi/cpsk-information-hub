CREATE OR REPLACE VIEW public.profile_with_auth_user
WITH (security_invoker = true) AS
SELECT
  p.*,
  COALESCE(
    u.raw_user_meta_data->>'display_name',
    u.raw_user_meta_data->>'full_name',
    split_part(u.email, '@', 1)
  ) AS display_name,
  u.email
FROM public.profile p
LEFT JOIN auth.users u ON u.id = p.id
WHERE
  auth.uid() = p.id
  OR public.is_admin();

GRANT SELECT ON public.profile_with_auth_user TO PUBLIC;