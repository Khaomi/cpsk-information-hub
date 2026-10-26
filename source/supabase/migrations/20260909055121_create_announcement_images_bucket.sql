INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'announcement-images',
  'announcement-images',
  true,
  10485760, -- 10 MB
  ARRAY['image/*']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view announcement images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'announcement-images');

CREATE POLICY "Staff can upload announcement images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'announcement-images' AND public.is_admin());

CREATE POLICY "Staff can delete announcement images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'announcement-images' AND public.is_admin());
