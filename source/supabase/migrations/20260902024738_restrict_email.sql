
CREATE OR REPLACE FUNCTION public.hook_validate_signup_email(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  email_domain TEXT;

  allowed_domains TEXT[] := ARRAY[
    'ku.th',
    'ku.ac.th'
  ];
BEGIN
  user_email := LOWER(TRIM(event->'user'->>'email'));

  IF user_email IS NULL OR user_email = '' THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'Email address is required for registration.'
      )
    );
  END IF;

  email_domain := split_part(user_email, '@', 2);

  IF NOT (email_domain = ANY(allowed_domains)) THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'Access restricted. This application is limited to authorized email addresses.'
      )
    );
  END IF;

  RETURN jsonb_build_object('decision', 'continue');
END;
$$;

REVOKE ALL ON FUNCTION public.hook_validate_signup_email(jsonb) FROM PUBLIC, ANON, AUTHENTICATED;
GRANT EXECUTE ON FUNCTION public.hook_validate_signup_email(jsonb) TO supabase_auth_admin;