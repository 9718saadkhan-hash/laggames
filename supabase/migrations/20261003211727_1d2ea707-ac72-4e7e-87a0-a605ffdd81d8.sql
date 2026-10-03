CREATE TABLE public.game_media_autofill_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  fields text[] NOT NULL DEFAULT '{}',
  previous_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  applied_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL,
  match_name text,
  confidence integer NOT NULL DEFAULT 0,
  undone_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_media_autofill_history TO authenticated;
GRANT ALL ON public.game_media_autofill_history TO service_role;
ALTER TABLE public.game_media_autofill_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage game media autofill history"
ON public.game_media_autofill_history
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX game_media_autofill_history_game_created_idx
ON public.game_media_autofill_history (game_id, created_at DESC);