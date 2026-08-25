
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP POLICY "games public read" ON public.games;
CREATE POLICY "games anon read" ON public.games FOR SELECT TO anon USING (visible = true);
CREATE POLICY "games auth read" ON public.games FOR SELECT TO authenticated USING (visible = true OR public.has_role(auth.uid(),'admin'));

DROP POLICY "psplus public read" ON public.ps_plus_plans;
CREATE POLICY "psplus anon read" ON public.ps_plus_plans FOR SELECT TO anon USING (visible = true);
CREATE POLICY "psplus auth read" ON public.ps_plus_plans FOR SELECT TO authenticated USING (visible = true OR public.has_role(auth.uid(),'admin'));

DROP POLICY "ott public read" ON public.ott_plans;
CREATE POLICY "ott anon read" ON public.ott_plans FOR SELECT TO anon USING (visible = true);
CREATE POLICY "ott auth read" ON public.ott_plans FOR SELECT TO authenticated USING (visible = true OR public.has_role(auth.uid(),'admin'));

DROP POLICY "hero public read" ON public.hero_banners;
CREATE POLICY "hero anon read" ON public.hero_banners FOR SELECT TO anon USING (visible = true);
CREATE POLICY "hero auth read" ON public.hero_banners FOR SELECT TO authenticated USING (visible = true OR public.has_role(auth.uid(),'admin'));

DROP POLICY "collab public read" ON public.collab_videos;
CREATE POLICY "collab anon read" ON public.collab_videos FOR SELECT TO anon USING (visible = true);
CREATE POLICY "collab auth read" ON public.collab_videos FOR SELECT TO authenticated USING (visible = true OR public.has_role(auth.uid(),'admin'));

DROP POLICY "reviews public read" ON public.reviews;
CREATE POLICY "reviews anon read" ON public.reviews FOR SELECT TO anon USING (status = 'approved');
CREATE POLICY "reviews auth read" ON public.reviews FOR SELECT TO authenticated
  USING (status = 'approved' OR auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
