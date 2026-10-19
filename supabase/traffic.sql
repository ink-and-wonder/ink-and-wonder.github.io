-- Anonymous aggregate page views. Run after schema.sql; no visitor rows exist.
begin;
create table if not exists public.site_traffic_daily (
  day date primary key,
  page_views bigint not null default 0 check (page_views >= 0)
);
alter table public.site_traffic_daily enable row level security;
drop policy if exists "No visitor access" on public.site_traffic_daily;
create policy "No visitor access" on public.site_traffic_daily for all to anon,authenticated
  using (false) with check (false);
revoke all on public.site_traffic_daily from public, anon, authenticated;
grant select on public.site_traffic_daily to service_role;

create or replace function public.record_site_pageview()
returns void language plpgsql security definer set search_path = '' as $$
declare
  request_origin text := coalesce(nullif(current_setting('request.headers',true),'')::jsonb ->> 'origin','');
begin
  -- Browser-origin filter, not authentication: automated counts remain approximate.
  if request_origin <> 'https://ink-and-wonder.github.io' then return; end if;
  insert into public.site_traffic_daily(day,page_views)
    values ((clock_timestamp() at time zone 'Asia/Kolkata')::date,1)
    on conflict (day) do update set page_views=public.site_traffic_daily.page_views+1;
end;
$$;
revoke all on function public.record_site_pageview() from public, anon, authenticated;
grant execute on function public.record_site_pageview() to anon;

create or replace view public.site_traffic_dashboard
with (security_invoker=true) as
with totals as (
  select coalesce(sum(page_views) filter(where day=(now() at time zone 'Asia/Kolkata')::date),0)::bigint as today,
    coalesce(sum(page_views) filter(where day>=(now() at time zone 'Asia/Kolkata')::date-6),0)::bigint as last_7_days,
    coalesce(sum(page_views) filter(where day>=(now() at time zone 'Asia/Kolkata')::date-29),0)::bigint as last_30_days,
    coalesce(sum(page_views),0)::bigint as all_time
  from public.site_traffic_daily
)
select today,last_7_days,last_30_days,all_time from totals;
revoke all on public.site_traffic_dashboard from public,anon,authenticated;
grant select on public.site_traffic_dashboard to service_role;
comment on view public.site_traffic_dashboard is 'Private page-view totals. Days use Asia/Kolkata. Page views are not unique people; counts start at installation.';
comment on table public.site_traffic_daily is 'Aggregate page views only. No IP, email, user ID, visitor ID, referrer, device, or URL is stored.';
notify pgrst, 'reload schema';
commit;
