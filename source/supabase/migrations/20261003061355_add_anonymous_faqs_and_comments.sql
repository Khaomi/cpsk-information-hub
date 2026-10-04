-- 1. Ensure Enums
DO $$ BEGIN
  CREATE TYPE faq_status AS ENUM ('UNANSWERED', 'ANSWERED', 'RESOLVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Base Table
CREATE TABLE IF NOT EXISTS faqs (
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

-- 3. Junction Tables
CREATE TABLE IF NOT EXISTS faq_tag (
  faq_id UUID REFERENCES faqs(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tag(id) ON DELETE CASCADE,
  PRIMARY KEY (faq_id, tag_id)
);

CREATE TABLE IF NOT EXISTS faq_attachment (
  faq_id UUID REFERENCES faqs(id) ON DELETE CASCADE,
  attachment_id UUID REFERENCES attachment(id) ON DELETE CASCADE,
  PRIMARY KEY (faq_id, attachment_id)
);

-- 4. Create Details View
CREATE OR REPLACE VIEW faq_with_details AS
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
  p.display_name AS author_name,
  p.email AS author_email
FROM faqs f
LEFT JOIN profile_with_auth_user p ON f.creator_id = p.id;