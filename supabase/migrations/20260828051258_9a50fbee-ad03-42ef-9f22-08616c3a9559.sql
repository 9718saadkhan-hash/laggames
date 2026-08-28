-- DEALS
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  image_url TEXT,
  discount TEXT,
  badge TEXT,
  cta_label TEXT NOT NULL DEFAULT 'VIEW DEALS',
  cta_link TEXT,
  start_date DATE,
  end_date DATE,
  featured BOOLEAN NOT NULL DEFAULT false,
  show_in_hero BOOLEAN NOT NULL DEFAULT true,
  visible BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.deals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deals TO authenticated;
GRANT ALL ON public.deals TO service_role;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deals anon read" ON public.deals FOR SELECT TO anon USING (visible = true);
CREATE POLICY "deals auth read" ON public.deals FOR SELECT TO authenticated USING (visible = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "deals admin write" ON public.deals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER deals_updated BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.deal_games (
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  display_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (deal_id, game_id)
);
GRANT SELECT ON public.deal_games TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_games TO authenticated;
GRANT ALL ON public.deal_games TO service_role;
ALTER TABLE public.deal_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deal games anon read" ON public.deal_games FOR SELECT TO anon USING (true);
CREATE POLICY "deal games auth read" ON public.deal_games FOR SELECT TO authenticated USING (true);
CREATE POLICY "deal games admin write" ON public.deal_games FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- UPCOMING GAMES
CREATE TABLE public.upcoming_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  short_description TEXT,
  description TEXT,
  cover_url TEXT,
  banner_url TEXT,
  platform TEXT NOT NULL DEFAULT 'PS5',
  genre TEXT,
  developer TEXT,
  publisher TEXT,
  release_date DATE,
  release_note TEXT,
  trailer_url TEXT,
  featured BOOLEAN NOT NULL DEFAULT false,
  visible BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.upcoming_games TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.upcoming_games TO authenticated;
GRANT ALL ON public.upcoming_games TO service_role;
ALTER TABLE public.upcoming_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "upcoming anon read" ON public.upcoming_games FOR SELECT TO anon USING (visible = true);
CREATE POLICY "upcoming auth read" ON public.upcoming_games FOR SELECT TO authenticated USING (visible = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "upcoming admin write" ON public.upcoming_games FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER upcoming_updated BEFORE UPDATE ON public.upcoming_games FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ACTIVITY LOG
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  entity_label TEXT,
  actor_id UUID,
  actor_name TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity admin read" ON public.activity_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "activity insert own" ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() OR actor_id IS NULL);
CREATE POLICY "activity admin delete" ON public.activity_log FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- EXTRA COLUMNS
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.hero_banners ADD COLUMN IF NOT EXISTS cta_link TEXT;
ALTER TABLE public.hero_banners ADD COLUMN IF NOT EXISTS badge TEXT;
ALTER TABLE public.hero_banners ADD COLUMN IF NOT EXISTS discount TEXT;
ALTER TABLE public.hero_banners ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL;
GRANT DELETE ON public.profiles TO authenticated;
CREATE POLICY "profiles admin delete" ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- SEED DEALS
INSERT INTO public.deals (title, subtitle, description, image_url, discount, badge, cta_label, cta_link, start_date, end_date, featured, show_in_hero, visible, display_order) VALUES
('BLACK FRIDAY', 'Biggest savings of the year', 'Huge price drops across PS4 and PS5 titles for a limited time.', '/deals/black-friday.jpg', 'Up to 70% OFF', 'LIMITED TIME', 'VIEW DEALS', '/deals', NULL, NULL, true, true, true, 1),
('DAYS OF PLAY', 'Check out our latest PlayStation deals.', 'Our annual celebration of PlayStation gaming with special LAG pricing.', '/deals/days-of-play.jpg', 'Up to 50% OFF', 'FEATURED', 'VIEW DEALS', '/deals', NULL, NULL, false, true, true, 2),
('LAG SPECIAL DEALS', 'Handpicked offers from LAG', 'Weekend bundles, rental discounts and subscription combos picked by us.', '/deals/lag-special.jpg', 'Weekend Only', 'LAG SPECIAL', 'VIEW DEALS', '/deals', NULL, NULL, false, true, true, 3);

-- SEED UPCOMING GAMES
INSERT INTO public.upcoming_games (slug, title, short_description, description, cover_url, platform, genre, release_date, featured, visible, display_order) VALUES
('gta-vi-upcoming', 'Grand Theft Auto VI', 'Return to Vice City in the most anticipated release ever.', 'Rockstar returns to Vice City with a brand new criminal saga. Pre-order details will be announced on WhatsApp.', '/games/gta-vi.jpg', 'PS5', 'Action Adventure', '2027-05-26', true, true, 1),
('wolverine-upcoming', 'Marvel''s Wolverine', 'Brutal, gritty solo adventure from Insomniac Games.', 'A standalone Wolverine story set in the same universe as Marvel''s Spider-Man.', '/games/spider-man-2.jpg', 'PS5', 'Action', '2027-01-15', false, true, 2),
('elden-ring-next', 'Elden Ring: Next Chapter', 'A new journey through the Lands Between.', 'FromSoftware expands the Elden Ring world with a new campaign.', '/games/elden-ring-shadow.jpg', 'PS4 & PS5', 'RPG', '2026-11-20', false, true, 3);