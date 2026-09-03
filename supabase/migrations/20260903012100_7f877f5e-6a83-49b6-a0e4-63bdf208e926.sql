-- Media library
CREATE TABLE public.media_library (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'image',
  url text not null,
  storage_path text,
  mime_type text,
  size integer,
  width integer,
  height integer,
  folder text not null default 'general',
  usage text,
  uploaded_by uuid,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_library TO authenticated;
GRANT ALL ON public.media_library TO service_role;
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media admin all" ON public.media_library FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Reviews: image + moderation notes
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS image_position text default '50% 50%';
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS admin_note text;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS updated_at timestamptz not null default now();
-- allow anonymous visitors to submit a pending review
DROP POLICY IF EXISTS "reviews public insert" ON public.reviews;
CREATE POLICY "reviews public insert" ON public.reviews FOR INSERT TO anon
  WITH CHECK (status = 'pending' AND user_id IS NULL);
GRANT INSERT ON public.reviews TO anon;

-- Image focal positions
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS cover_position text default '50% 50%';
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS banner_position text default '50% 50%';
ALTER TABLE public.upcoming_games ADD COLUMN IF NOT EXISTS cover_position text default '50% 50%';
ALTER TABLE public.upcoming_games ADD COLUMN IF NOT EXISTS banner_position text default '50% 50%';
ALTER TABLE public.upcoming_games ADD COLUMN IF NOT EXISTS gallery text[] not null default '{}'::text[];
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS image_position text default '50% 50%';
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.hero_banners ADD COLUMN IF NOT EXISTS image_position text default '50% 50%';
ALTER TABLE public.ps_plus_plans ADD COLUMN IF NOT EXISTS image_position text default '50% 50%';
ALTER TABLE public.ott_plans ADD COLUMN IF NOT EXISTS image_position text default '50% 50%';

-- Deal slugs
UPDATE public.deals SET slug = regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g') WHERE slug IS NULL;
UPDATE public.deals d SET slug = d.slug || '-' || substr(d.id::text,1,4)
  WHERE EXISTS (SELECT 1 FROM public.deals x WHERE x.slug = d.slug AND x.id <> d.id);
CREATE UNIQUE INDEX IF NOT EXISTS deals_slug_key ON public.deals(slug);

-- Collab videos: direct uploads
ALTER TABLE public.collab_videos ADD COLUMN IF NOT EXISTS storage_path text;
ALTER TABLE public.collab_videos ADD COLUMN IF NOT EXISTS source text not null default 'external';
ALTER TABLE public.collab_videos ALTER COLUMN url DROP NOT NULL;

-- Customer sessions (login/device info)
CREATE TABLE public.customer_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  device text,
  browser text,
  os text,
  user_agent text,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_sessions TO authenticated;
GRANT ALL ON public.customer_sessions TO service_role;
ALTER TABLE public.customer_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions own read" ON public.customer_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "sessions own insert" ON public.customer_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions own update" ON public.customer_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "sessions own delete" ON public.customer_sessions FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- Customer activity timeline
CREATE TABLE public.customer_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  action text not null,
  detail text,
  entity_type text,
  entity_id text,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT ON public.customer_activity TO authenticated;
GRANT ALL ON public.customer_activity TO service_role;
ALTER TABLE public.customer_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cust activity read" ON public.customer_activity FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "cust activity insert" ON public.customer_activity FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Storage policies for the private media bucket (videos)
CREATE POLICY "media read" ON storage.objects FOR SELECT TO authenticated, anon
  USING (bucket_id = 'media');
CREATE POLICY "media admin insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "media admin update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'media' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "media admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND public.has_role(auth.uid(),'admin'));