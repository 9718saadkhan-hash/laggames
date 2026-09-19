-- 1) site_settings: replace open read with an allowlist of public content keys
drop policy if exists "settings public read" on public.site_settings;
create policy "settings public read" on public.site_settings
for select using (key = any (array['about','categories','comparison','contact','footer','how_it_works','policies']));

-- 2) contact_messages: keep open submissions but validate the row contents
drop policy if exists "contact anyone insert" on public.contact_messages;
create policy "contact anyone insert" on public.contact_messages
for insert with check (
  char_length(btrim(name)) between 1 and 200
  and char_length(btrim(message)) between 1 and 5000
  and (email is null or char_length(email) <= 320)
  and (phone is null or char_length(phone) <= 32)
);

-- 3) media bucket: drop the unbound read policy (bucket made public via storage tool)
drop policy if exists "media read" on storage.objects;