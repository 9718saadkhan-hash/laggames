CREATE OR REPLACE FUNCTION public.game_media_presence()
RETURNS TABLE(id uuid, has_cover boolean, has_banner boolean, gallery_count integer, has_trailer boolean)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT g.id,
         coalesce(g.cover_url,'') <> '',
         coalesce(g.banner_url,'') <> '',
         coalesce(array_length(g.gallery,1),0),
         coalesce(g.trailer_url,'') <> ''
  FROM public.games g;
$$;
REVOKE EXECUTE ON FUNCTION public.game_media_presence() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.game_media_presence() TO authenticated;