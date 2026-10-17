-- Run once in your own Supabase project's SQL Editor. Safe to run again.
begin;
create table if not exists public.game_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  constraint game_save_shape check (
    coalesce((jsonb_typeof(payload) = 'object'
    and payload ->> 'version' = '2'
    and jsonb_typeof(payload -> 'completed') = 'object'
    and jsonb_typeof(payload -> 'seals') = 'array'
    and jsonb_typeof(payload -> 'discoveries') = 'array'
    and octet_length(payload::text) <= 8000000),false)
  )
);
alter table public.game_saves enable row level security;
revoke all on public.game_saves from anon;
grant select, insert, update, delete on public.game_saves to authenticated;
drop policy if exists "Read own story" on public.game_saves;
create policy "Read own story" on public.game_saves for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Create own story" on public.game_saves;
create policy "Create own story" on public.game_saves for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Update own story" on public.game_saves;
create policy "Update own story" on public.game_saves for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Delete own story" on public.game_saves;
create policy "Delete own story" on public.game_saves for delete to authenticated using ((select auth.uid()) = user_id);

-- Compare-and-swap prevents an older tablet overwriting another device's save.
create or replace function public.commit_game_save(expected_revision bigint, new_payload jsonb)
returns setof public.game_saves
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to save a story' using errcode = '42501';
  end if;
  if expected_revision = 0 then
    return query insert into public.game_saves(user_id,payload,revision,updated_at)
      values(auth.uid(),new_payload,1,now())
      on conflict (user_id) do nothing returning *;
  else
    return query update public.game_saves set payload=new_payload,
      revision=game_saves.revision+1,updated_at=now()
      where user_id=auth.uid() and revision=expected_revision returning *;
  end if;
end;
$$;
revoke all on function public.commit_game_save(bigint,jsonb) from public,anon;
grant execute on function public.commit_game_save(bigint,jsonb) to authenticated;
commit;
