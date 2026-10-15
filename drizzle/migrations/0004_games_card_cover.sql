ALTER TABLE public.games ADD COLUMN IF NOT EXISTS card_cover_url text;
COMMENT ON COLUMN public.games.card_cover_url IS 'Lightweight card-size copy of cover_url (same ratio, no crop).';