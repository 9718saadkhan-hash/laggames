CREATE TABLE public.image_compress_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table text NOT NULL,
  row_key text NOT NULL,
  field text NOT NULL,
  path text NOT NULL DEFAULT '',
  original text NOT NULL,
  compressed text NOT NULL,
  original_bytes integer NOT NULL,
  compressed_bytes integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.image_compress_backups TO authenticated;
GRANT ALL ON public.image_compress_backups TO service_role;
ALTER TABLE public.image_compress_backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage compress backups" ON public.image_compress_backups
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));