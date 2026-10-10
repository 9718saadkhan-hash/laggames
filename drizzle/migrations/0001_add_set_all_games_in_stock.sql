CREATE OR REPLACE FUNCTION public.set_all_games_in_stock()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH updated AS (
    UPDATE public.games
    SET primary_available = true,
        secondary_available = true,
        availability = 'in_stock',
        updated_at = now()
    WHERE primary_available IS DISTINCT FROM true
       OR secondary_available IS DISTINCT FROM true
    RETURNING id
  )
  SELECT count(*)::integer FROM updated;
$$;

REVOKE ALL ON FUNCTION public.set_all_games_in_stock() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_all_games_in_stock() TO authenticated;