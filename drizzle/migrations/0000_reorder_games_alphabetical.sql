create or replace function public.reorder_games_alphabetical()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  reordered integer;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Only admins can reorder games.';
  end if;

  with ranked as (
    select id, row_number() over (order by lower(title) asc, id) as rn
    from public.games
  )
  update public.games g
  set display_order = ranked.rn,
      updated_at = now()
  from ranked
  where g.id = ranked.id;

  get diagnostics reordered = row_count;
  return reordered;
end;
$$;

revoke all on function public.reorder_games_alphabetical() from public, anon;
grant execute on function public.reorder_games_alphabetical() to authenticated;