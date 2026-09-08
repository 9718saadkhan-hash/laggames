CREATE TABLE public.game_editions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  name text NOT NULL,
  note text,
  price_30 numeric,
  price_60 numeric,
  price_permanent numeric,
  old_price numeric,
  visible boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.game_editions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_editions TO authenticated;
GRANT ALL ON public.game_editions TO service_role;

ALTER TABLE public.game_editions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editions are publicly readable"
  ON public.game_editions FOR SELECT
  USING (true);

CREATE POLICY "Admins manage editions"
  ON public.game_editions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX game_editions_game_id_idx ON public.game_editions (game_id);

CREATE TRIGGER game_editions_updated
  BEFORE UPDATE ON public.game_editions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();