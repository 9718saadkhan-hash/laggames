-- 1) Lock down user_roles writes to admins only (prevents self-granted admin,
--    which also protects orders' customer_name / customer_phone).
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;
REVOKE ALL ON public.user_roles FROM anon;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

DROP POLICY IF EXISTS "roles admin insert" ON public.user_roles;
DROP POLICY IF EXISTS "roles admin update" ON public.user_roles;
DROP POLICY IF EXISTS "roles admin delete" ON public.user_roles;

CREATE POLICY "roles admin insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "roles admin update" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "roles admin delete" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2) has_role stays SECURITY DEFINER (needed inside RLS policies) but can only
--    answer for the caller's own user id, and is no longer callable by anon.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (_user_id = auth.uid() OR auth.uid() IS NULL)
  );
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;

-- 3) deal_games: public reads only for visible deals + visible games.
DROP POLICY IF EXISTS "deal games anon read" ON public.deal_games;
DROP POLICY IF EXISTS "deal games auth read" ON public.deal_games;

CREATE POLICY "deal games public read" ON public.deal_games
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND d.visible)
    AND EXISTS (SELECT 1 FROM public.games g WHERE g.id = game_id AND g.visible)
  );

CREATE POLICY "deal games admin read" ON public.deal_games
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4) game_editions: public reads only for visible editions of visible games.
DROP POLICY IF EXISTS "Editions are publicly readable" ON public.game_editions;

CREATE POLICY "Visible editions are publicly readable" ON public.game_editions
  FOR SELECT TO anon, authenticated
  USING (
    visible
    AND EXISTS (SELECT 1 FROM public.games g WHERE g.id = game_id AND g.visible)
  );

CREATE POLICY "Admins read all editions" ON public.game_editions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5) media_library stays admin-only (fail-closed, intentional).
REVOKE ALL ON public.media_library FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_library TO authenticated;
GRANT ALL ON public.media_library TO service_role;