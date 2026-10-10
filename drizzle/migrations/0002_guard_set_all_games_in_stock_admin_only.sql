CREATE OR REPLACE FUNCTION public.set_all_games_in_stock()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can set all games in stock';
  END IF;

  UPDATE public.games
  SET primary_available = true,
      secondary_available = true,
      availability = 'in_stock',
      updated_at = now()
  WHERE primary_available IS DISTINCT FROM true
     OR secondary_available IS DISTINCT FROM true;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;