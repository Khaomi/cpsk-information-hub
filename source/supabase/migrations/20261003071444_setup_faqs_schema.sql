-- 1. Create Status Enum
DO $$ BEGIN
  CREATE TYPE faq_status AS ENUM ('UNANSWERED', 'ANSWERED', 'RESOLVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Base Table: faqs
CREATE TABLE IF NOT EXISTS public.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT,
  status faq_status NOT NULL DEFAULT 'UNANSWERED',
  is_anonymous BOOLEAN NOT NULL DEFAULT true,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  answered_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Junction Table: faq_tag
CREATE TABLE IF NOT EXISTS public.faq_tag (
  faq_id UUID REFERENCES public.faqs(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.tag(id) ON DELETE CASCADE,
  PRIMARY KEY (faq_id, tag_id)
);

-- 4. Junction Table: faq_attachment
CREATE TABLE IF NOT EXISTS public.faq_attachment (
  faq_id UUID REFERENCES public.faqs(id) ON DELETE CASCADE,
  attachment_id UUID REFERENCES public.attachment(id) ON DELETE CASCADE,
  PRIMARY KEY (faq_id, attachment_id)
);

-- 5. Table: faq_comments
CREATE TABLE IF NOT EXISTS public.faq_comments (
  id UUID REFERENCES public.faqs(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_staff BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 6. Create/Replace view cleanly (joins directly on auth.users)
CREATE OR REPLACE VIEW public.faq_with_details
WITH (security_invoker = true) AS
SELECT 
  f.id,
  f.question,
  f.answer,
  f.status,
  f.is_anonymous,
  f.creator_id,
  f.answered_by_id,
  f.created_at,
  f.updated_at,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'display_name', u.email, 'Anonymous') AS author_name,
  u.email AS author_email
FROM public.faqs f
LEFT JOIN auth.users u ON f.creator_id = u.id;

-- Explicitly GRANT access on the view to API roles
GRANT SELECT ON public.faq_with_details TO anon, authenticated, service_role;

-- 7. Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_faqs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_faqs_updated_at ON public.faqs;
CREATE TRIGGER tr_faqs_updated_at
  BEFORE UPDATE ON public.faqs
  FOR EACH ROW
  EXECUTE FUNCTION update_faqs_updated_at();

-------------------------------------------------------
-- Row Level Security (RLS) Policies
-------------------------------------------------------

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_tag ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_attachment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_comments ENABLE ROW LEVEL SECURITY;

-- FAQs RLS
CREATE POLICY "Allow public read access to faqs"
  ON public.faqs FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to create faqs"
  ON public.faqs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Allow staff or author to update faqs"
  ON public.faqs FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = creator_id OR public.is_admin()
  );

-- FAQ Tags RLS
CREATE POLICY "Allow public read access to faq_tag"
  ON public.faq_tag FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to insert faq_tag"
  ON public.faq_tag FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete faq_tag"
  ON public.faq_tag FOR DELETE
  TO authenticated
  USING (true);

-- FAQ Attachments RLS
CREATE POLICY "Allow public read access to faq_attachment"
  ON public.faq_attachment FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to manage faq_attachment"
  ON public.faq_attachment FOR ALL
  TO authenticated
  USING (true);

-- FAQ Comments RLS
CREATE POLICY "Allow public read access to faq_comments"
  ON public.faq_comments FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to create comments"
  ON public.faq_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- 8. Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';