ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS country_code text DEFAULT '+91';

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique
  ON public.profiles (lower(username)) WHERE username IS NOT NULL;

ALTER TABLE public.ps_plus_plans
  ADD COLUMN IF NOT EXISTS price_1m numeric,
  ADD COLUMN IF NOT EXISTS price_3m numeric,
  ADD COLUMN IF NOT EXISTS price_12m numeric;

DROP POLICY IF EXISTS "orders admin insert" ON public.orders;
CREATE POLICY "orders admin insert" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));