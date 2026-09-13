GRANT SELECT ON public.game_editions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_editions TO authenticated;
GRANT ALL ON public.game_editions TO service_role;