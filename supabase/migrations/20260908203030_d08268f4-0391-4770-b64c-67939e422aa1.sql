GRANT SELECT ON public.game_editions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_editions TO authenticated;
GRANT ALL ON public.game_editions TO service_role;

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS price_30_secondary numeric,
  ADD COLUMN IF NOT EXISTS price_60_secondary numeric,
  ADD COLUMN IF NOT EXISTS price_permanent_secondary numeric;

ALTER TABLE public.game_editions
  ADD COLUMN IF NOT EXISTS price_30_secondary numeric,
  ADD COLUMN IF NOT EXISTS price_60_secondary numeric,
  ADD COLUMN IF NOT EXISTS price_permanent_secondary numeric;