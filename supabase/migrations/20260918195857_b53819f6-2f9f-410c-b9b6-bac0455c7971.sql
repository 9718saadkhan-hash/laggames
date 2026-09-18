ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS igdb_id bigint,
  ADD COLUMN IF NOT EXISTS metadata_source text,
  ADD COLUMN IF NOT EXISTS metadata_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS metadata_status text,
  ADD COLUMN IF NOT EXISTS metadata_note text,
  ADD COLUMN IF NOT EXISTS metadata_fields jsonb;