
CREATE TYPE public.app_role AS ENUM ('admin','customer');

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "roles read own" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- GAMES
CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  short_description TEXT,
  description TEXT,
  cover_url TEXT,
  banner_url TEXT,
  gallery TEXT[] NOT NULL DEFAULT '{}',
  trailer_url TEXT,
  platform TEXT NOT NULL DEFAULT 'PS4 & PS5',
  genre TEXT,
  developer TEXT,
  publisher TEXT,
  release_date DATE,
  game_size TEXT,
  rating NUMERIC(3,1),
  primary_available BOOLEAN NOT NULL DEFAULT true,
  secondary_available BOOLEAN NOT NULL DEFAULT true,
  primary_description TEXT,
  secondary_description TEXT,
  price_30 NUMERIC,
  price_60 NUMERIC,
  price_permanent NUMERIC,
  old_price NUMERIC,
  availability TEXT NOT NULL DEFAULT 'In Stock',
  featured BOOLEAN NOT NULL DEFAULT false,
  trending BOOLEAN NOT NULL DEFAULT false,
  hot_deal BOOLEAN NOT NULL DEFAULT false,
  new_release BOOLEAN NOT NULL DEFAULT false,
  visible BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.games TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.games TO authenticated;
GRANT ALL ON public.games TO service_role;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "games public read" ON public.games FOR SELECT USING (visible = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "games admin write" ON public.games FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER games_updated BEFORE UPDATE ON public.games FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PS PLUS
CREATE TABLE public.ps_plus_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'Essential',
  duration TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT 'India',
  platform TEXT NOT NULL DEFAULT 'PS4 & PS5',
  price NUMERIC,
  old_price NUMERIC,
  description TEXT,
  features TEXT[] NOT NULL DEFAULT '{}',
  image_url TEXT,
  availability TEXT NOT NULL DEFAULT 'In Stock',
  visible BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ps_plus_plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ps_plus_plans TO authenticated;
GRANT ALL ON public.ps_plus_plans TO service_role;
ALTER TABLE public.ps_plus_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "psplus public read" ON public.ps_plus_plans FOR SELECT USING (visible = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "psplus admin write" ON public.ps_plus_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER psplus_updated BEFORE UPDATE ON public.ps_plus_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- OTT
CREATE TABLE public.ott_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  plan TEXT NOT NULL DEFAULT 'Premium',
  duration TEXT NOT NULL,
  quality TEXT,
  screens TEXT,
  price NUMERIC,
  old_price NUMERIC,
  description TEXT,
  availability TEXT NOT NULL DEFAULT 'In Stock',
  visible BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ott_plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ott_plans TO authenticated;
GRANT ALL ON public.ott_plans TO service_role;
ALTER TABLE public.ott_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ott public read" ON public.ott_plans FOR SELECT USING (visible = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "ott admin write" ON public.ott_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER ott_updated BEFORE UPDATE ON public.ott_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- HERO BANNERS
CREATE TABLE public.hero_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  image_url TEXT,
  game_slug TEXT,
  platform TEXT,
  price_from NUMERIC,
  release_date DATE,
  availability TEXT,
  cta_label TEXT NOT NULL DEFAULT 'BUY / RENT NOW',
  visible BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hero_banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hero_banners TO authenticated;
GRANT ALL ON public.hero_banners TO service_role;
ALTER TABLE public.hero_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hero public read" ON public.hero_banners FOR SELECT USING (visible = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "hero admin write" ON public.hero_banners FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- COLLAB VIDEOS
CREATE TABLE public.collab_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  platform TEXT NOT NULL DEFAULT 'youtube',
  visible BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.collab_videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collab_videos TO authenticated;
GRANT ALL ON public.collab_videos TO service_role;
ALTER TABLE public.collab_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "collab public read" ON public.collab_videos FOR SELECT USING (visible = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "collab admin write" ON public.collab_videos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ORDERS
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code TEXT NOT NULL DEFAULT ('LAG-' || upper(substr(md5(random()::text),1,6))),
  user_id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  product_type TEXT NOT NULL DEFAULT 'game',
  product_id UUID,
  product_name TEXT NOT NULL,
  platform TEXT,
  option_type TEXT,
  duration TEXT,
  price NUMERIC,
  status TEXT NOT NULL DEFAULT 'Pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders read own" ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "orders insert own" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "orders admin update" ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "orders admin delete" ON public.orders FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- REVIEWS
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  name TEXT NOT NULL,
  rating INT NOT NULL DEFAULT 5,
  review TEXT NOT NULL,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews public read" ON public.reviews FOR SELECT
  USING (status = 'approved' OR auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "reviews insert own" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews admin update" ON public.reviews FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "reviews admin delete" ON public.reviews FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR auth.uid() = user_id);

-- WISHLIST
CREATE TABLE public.wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, game_id)
);
GRANT SELECT, INSERT, DELETE ON public.wishlist TO authenticated;
GRANT ALL ON public.wishlist TO service_role;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wishlist own" ON public.wishlist FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- CONTACT MESSAGES
CREATE TABLE public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.contact_messages TO anon;
GRANT SELECT, INSERT, DELETE ON public.contact_messages TO authenticated;
GRANT ALL ON public.contact_messages TO service_role;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contact anyone insert" ON public.contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "contact admin read" ON public.contact_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "contact admin delete" ON public.contact_messages FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- SETTINGS
CREATE TABLE public.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings public read" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "settings admin write" ON public.site_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- SEED
INSERT INTO public.site_settings (key, value) VALUES
('contact', '{"brand":"LAG LIVE AS GAMERS","tagline":"BEST GAMES. BEST SERVICE. BEST EXPERIENCE.","whatsapp":"919915882125","whatsapp_display":"+91 9915882125","instagram":"lag_prince","whatsapp_group":"https://chat.whatsapp.com/FhEYxa03iI0GxJ3K2Ke6sL","email":""}'::jsonb),
('about', '{"heading":"ABOUT LAG LIVE AS GAMERS","body":"LAG LIVE AS GAMERS is a gaming-focused digital marketplace built for PlayStation players. We help gamers get the titles they want at prices that actually make sense — through flexible 30 day and 60 day rentals or permanent access, plus PS Plus and OTT subscriptions. Every order is handled personally over WhatsApp, so you always talk to a real gamer, not a bot."}'::jsonb),
('comparison', '{"title":"WHY DO OUR CUSTOMERS CHOOSE US?","rows":[{"feature":"Immediate Delivery","lag":true,"others":false},{"feature":"Best Price","lag":true,"others":false},{"feature":"24/7 Support","lag":true,"others":false},{"feature":"Refund Guarantee","lag":true,"others":false}]}'::jsonb),
('how_it_works', '{"steps":[{"title":"CHOOSE YOUR GAME","body":"Browse the catalog and pick your title. Select PS4 or PS5, Primary or Secondary where available, and 30 Days, 60 Days or Permanent."},{"title":"CONTACT / COMPLETE ORDER","body":"Tap ORDER ON WHATSAPP and we open WhatsApp with your order details already filled in. We confirm availability and share payment details."},{"title":"START PLAYING","body":"Once payment is confirmed, the required access details are delivered to you on WhatsApp according to the option you selected."}],"primary_text":"Play on your personal PlayStation account. Your own trophies, your own saved progress, and online or offline play depending on what the game requires. Available for rental or permanent depending on the title.","secondary_text":"Play using an account provided by LAG LIVE AS GAMERS. Full game access at a more affordable price. An internet connection may be required depending on the title. Available for rental or permanent options."}'::jsonb),
('policies', '{"terms":"By ordering from LAG LIVE AS GAMERS you agree that all digital products are delivered over WhatsApp after payment confirmation. Account sharing details provided for Secondary options must not be resold or redistributed.","privacy":"We only collect the information needed to process your order: your name, contact number and order details. We never sell or publicly share your personal data.","refund":"If a product cannot be delivered as described, you are eligible for a full refund. Refund requests must be raised on WhatsApp within 24 hours of delivery."}'::jsonb),
('footer', '{"note":"LAG LIVE AS GAMERS is an independent digital game store and is not affiliated with Sony Interactive Entertainment."}'::jsonb);

INSERT INTO public.games (slug,title,short_description,description,cover_url,banner_url,platform,genre,developer,publisher,release_date,game_size,rating,price_30,price_60,price_permanent,old_price,primary_description,secondary_description,trending,featured,hot_deal,new_release,display_order) VALUES
('gta-vi','GTA VI','The most anticipated open world of the decade lands in Vice City.','Grand Theft Auto VI takes you back to the neon-soaked state of Leonida and the sun-bleached streets of Vice City. Two criminals, one impossible score, and the biggest, most detailed world Rockstar has ever built.','/games/gta-vi.jpg','/games/gta-vi.jpg','PS5','Action / Open World','Rockstar Games','Rockstar Games','2026-05-26','140 GB',4.9,1499,2199,3499,4999,'Play on your personal PlayStation account with your own trophies and saves.','Play using an account provided by LAG. Cheaper, full game access.',true,true,true,true,1),
('spider-man-2','Marvel''s Spider-Man 2','Two Spider-Men. One city. Zero limits.','Peter Parker and Miles Morales return in a bigger, faster New York. Swing across Marvel''s New York with new powers, new suits and the symbiote threat closing in.','/games/spider-man-2.jpg','/games/spider-man-2.jpg','PS5','Action Adventure','Insomniac Games','Sony Interactive Entertainment','2023-10-20','98 GB',4.8,699,999,1799,2499,'Play on your personal PlayStation account with your own trophies and saves.','Play using an account provided by LAG. Cheaper, full game access.',true,true,true,false,2),
('ea-fc-26','EA SPORTS FC 26','The world''s game, rebuilt for the new season.','Every league, every squad, every celebration. FC 26 brings sharper gameplay, refreshed Ultimate Team and full club licensing for the new season.','/games/ea-fc-26.jpg','/games/ea-fc-26.jpg','PS4 & PS5','Sports','EA Sports','Electronic Arts','2025-09-26','60 GB',4.4,599,899,1599,NULL,'Play on your personal PlayStation account with your own trophies and saves.','Play using an account provided by LAG. Cheaper, full game access.',true,false,false,true,3),
('god-of-war-ragnarok','God of War Ragnarök','Kratos and Atreus face the end of all things.','Journey through the Nine Realms as Fimbulwinter closes in. A brutal, beautiful Norse epic with some of the finest combat on PlayStation.','/games/god-of-war-ragnarok.jpg','/games/god-of-war-ragnarok.jpg','PS4 & PS5','Action Adventure','Santa Monica Studio','Sony Interactive Entertainment','2022-11-09','85 GB',4.9,549,849,1499,2199,'Play on your personal PlayStation account with your own trophies and saves.','Play using an account provided by LAG. Cheaper, full game access.',true,true,true,false,4),
('cod-black-ops-7','Call of Duty: Black Ops 7','Fast, loud and relentless multiplayer warfare.','A new Black Ops campaign plus the multiplayer and Zombies modes the series is built on. Built for high-refresh, high-intensity play.','/games/cod-black-ops-7.jpg','/games/cod-black-ops-7.jpg','PS5','FPS / Shooter','Treyarch','Activision','2025-11-14','160 GB',4.2,899,1299,2299,NULL,'Play on your personal PlayStation account with your own trophies and saves.','Play using an account provided by LAG. Cheaper, full game access.',true,false,false,true,5),
('the-last-of-us-part-ii','The Last of Us Part II Remastered','A savage, unforgettable story of revenge.','Ellie''s journey through a broken America, remastered for PS5 with new modes, higher fidelity and rebuilt controls.','/games/the-last-of-us-part-ii.jpg','/games/the-last-of-us-part-ii.jpg','PS5','Action / Survival','Naughty Dog','Sony Interactive Entertainment','2024-01-19','78 GB',4.7,499,799,1399,1899,'Play on your personal PlayStation account with your own trophies and saves.','Play using an account provided by LAG. Cheaper, full game access.',false,true,true,false,6),
('elden-ring-shadow','Elden Ring: Shadow of the Erdtree','Step into the Land of Shadow.','The definitive Elden Ring experience with the Shadow of the Erdtree expansion. Punishing, gorgeous and endlessly deep.','/games/elden-ring-shadow.jpg','/games/elden-ring-shadow.jpg','PS4 & PS5','RPG / Souls-like','FromSoftware','Bandai Namco','2024-06-21','70 GB',4.8,749,1099,1999,NULL,'Play on your personal PlayStation account with your own trophies and saves.','Play using an account provided by LAG. Cheaper, full game access.',true,false,false,false,7),
('hogwarts-legacy','Hogwarts Legacy','Write your own wizarding story.','An open-world RPG set in the 1800s wizarding world. Attend classes, master spells and uncover an ancient secret.','/games/hogwarts-legacy.jpg','/games/hogwarts-legacy.jpg','PS4 & PS5','RPG / Open World','Avalanche Software','Warner Bros. Games','2023-02-10','85 GB',4.5,449,699,1299,1799,'Play on your personal PlayStation account with your own trophies and saves.','Play using an account provided by LAG. Cheaper, full game access.',false,false,true,false,8);

INSERT INTO public.hero_banners (title,subtitle,description,image_url,game_slug,platform,price_from,release_date,availability,display_order) VALUES
('GTA VI','HOT DEAL — PRE-BOOK OPEN','Vice City returns. Lock your copy in early at LAG prices and be playing on day one.','/games/gta-vi.jpg','gta-vi','PS5',1499,'2026-05-26','Pre-Order Open',1),
('Marvel''s Spider-Man 2','TRENDING NOW','Two Spider-Men, one city. Rent for 30 days or take it permanently.','/games/spider-man-2.jpg','spider-man-2','PS5',699,'2023-10-20','In Stock',2),
('God of War Ragnarök','BEST SELLER','The Norse epic everyone finishes in a weekend. Available on PS4 and PS5.','/games/god-of-war-ragnarok.jpg','god-of-war-ragnarok','PS4 & PS5',549,'2022-11-09','In Stock',3);

INSERT INTO public.ps_plus_plans (name,tier,duration,region,platform,price,old_price,description,features,display_order) VALUES
('PS Plus Essential','Essential','1 Month','India','PS4 & PS5',449,599,'Online multiplayer, monthly games and cloud saves.','{"Online multiplayer","Monthly games","Cloud saves","Exclusive store discounts"}',1),
('PS Plus Essential','Essential','12 Months','India','PS4 & PS5',2499,3499,'A full year of online multiplayer and monthly games.','{"Online multiplayer","Monthly games","Cloud saves","Exclusive store discounts"}',2),
('PS Plus Extra','Extra','3 Months','India','PS4 & PS5',1699,2199,'Everything in Essential plus the Game Catalog.','{"All Essential benefits","Game Catalog access","Hundreds of PS4 & PS5 titles"}',3),
('PS Plus Extra','Extra','12 Months','India','PS4 & PS5',4299,5499,'A full year of the Game Catalog and Essential benefits.','{"All Essential benefits","Game Catalog access","Hundreds of PS4 & PS5 titles"}',4),
('PS Plus Deluxe','Deluxe','12 Months','India','PS4 & PS5',5299,6999,'The top tier with classics catalog and game trials.','{"All Extra benefits","Classics Catalog","Game trials","Premium support"}',5);

INSERT INTO public.ott_plans (name,plan,duration,quality,screens,price,old_price,description,display_order) VALUES
('Netflix','Premium','1 Month','4K + HDR','1 Screen',199,299,'Netflix Premium access with 4K streaming.',1),
('Netflix','Premium','3 Months','4K + HDR','1 Screen',499,749,'Three months of Netflix Premium at a lower monthly rate.',2),
('Amazon Prime Video','Premium','1 Year','4K + HDR','Multi-device',699,1499,'A full year of Prime Video.',3),
('Disney+ Hotstar','Super','1 Year','Full HD','2 Screens',599,899,'Sports, movies and originals for a year.',4),
('Spotify','Premium','3 Months','Very High','1 Account',249,399,'Ad-free music with offline downloads.',5),
('YouTube Premium','Premium','1 Month','Up to 4K','1 Account',129,189,'Ad-free YouTube plus background play.',6);

INSERT INTO public.reviews (name,rating,review,status,featured) VALUES
('Arjun M.',5,'Ordered GTA V secondary at 1AM and had it running in 20 minutes. Prices are unreal compared to the store.','approved',true),
('Rohit S.',5,'Took Spider-Man 2 on the 30 day plan. Smooth process, everything explained clearly on WhatsApp.','approved',true),
('Simran K.',4,'PS Plus Deluxe renewal was quick and cheaper than anywhere else I checked. Will come back.','approved',false),
('Karan D.',5,'Primary account for God of War, my own trophies, zero issues. Genuinely trustworthy seller.','approved',true),
('Ankit V.',5,'Netflix Premium for 3 months at that price is a steal. Support replied in a minute.','approved',false);
