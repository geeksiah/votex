-- Create-event wizard (O3: Type → Basics → Look → Rounds → Rules → Price → Review).
-- A draft is saved from the first "Save draft" or "Continue" and can be finished later.

alter type public.event_type add value if not exists 'nominations';
alter type public.event_type add value if not exists 'tickets';

alter table public.events
  -- Wizard step to reopen a draft at (1–7); null once the wizard is finished.
  add column setup_step smallint check (setup_step between 1 and 7),
  -- Quick picks voters see on the vote screen and the one chosen by default (O3 step 6).
  add column quick_picks integer[] not null default '{1,10,50,100}'
    check (cardinality(quick_picks) between 1 and 6 and 0 < all (quick_picks)),
  add column default_pick integer not null default 10 check (default_pick > 0),
  -- Event voting rules (O3 step 5, O12). Categories can override them later.
  add column show_live_results boolean not null default true,
  add column hide_results_last_hours smallint check (hide_results_last_hours between 1 and 168),
  add column ussd_enabled boolean not null default false,
  add column max_votes_per_phone integer check (max_votes_per_phone > 0);

grant update (setup_step, quick_picks, default_pick, show_live_results, hide_results_last_hours, ussd_enabled, max_votes_per_phone)
  on public.events to authenticated;

-- Rounds (O3 step 4, O5). Every event has at least one; categories belong to a round (step 2 later).
create type public.round_mode as enum ('public', 'judges');

create table public.rounds (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  position smallint not null check (position between 1 and 20),
  name text not null check (char_length(name) between 1 and 60),
  mode public.round_mode not null default 'public',
  opens_at timestamptz,
  closes_at timestamptz,
  -- Share of the final result, e.g. public vote 70 and judges 30.
  weight_pct smallint not null default 100 check (weight_pct between 0 and 100),
  -- Round price overrides the event price (master plan §3, "Vote price per category").
  price_minor bigint check (price_minor >= 0),
  created_at timestamptz not null default now(),
  unique (event_id, position),
  check (closes_at is null or opens_at is null or closes_at > opens_at)
);
create index rounds_event_idx on public.rounds (event_id);

-- A round always belongs to the same organiser as its event.
create or replace function private.round_tenant_matches()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.events e where e.id = new.event_id and e.tenant_id = new.tenant_id) then
    raise exception 'Round and event belong to different organisers' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger rounds_tenant_matches before insert or update on public.rounds
  for each row execute function private.round_tenant_matches();

alter table public.rounds enable row level security;
grant select on public.rounds to anon, authenticated;
grant insert, delete on public.rounds to authenticated;
grant update (position, name, mode, opens_at, closes_at, weight_pct, price_minor) on public.rounds to authenticated;

create policy rounds_select_team on public.rounds for select to authenticated
  using (private.is_member(tenant_id));
create policy rounds_select_public on public.rounds for select to anon, authenticated
  using (exists (select 1 from public.events e where e.id = event_id and e.status <> 'draft'));
create policy rounds_insert on public.rounds for insert to authenticated
  with check (private.has_role(tenant_id, array['owner', 'admin']::public.member_role[]));
create policy rounds_update on public.rounds for update to authenticated
  using (private.has_role(tenant_id, array['owner', 'admin']::public.member_role[]))
  with check (private.has_role(tenant_id, array['owner', 'admin']::public.member_role[]));
create policy rounds_delete on public.rounds for delete to authenticated
  using (private.has_role(tenant_id, array['owner', 'admin']::public.member_role[]));

-- Event links are unique across all organisers, including drafts nobody else can see,
-- so availability is checked here. Words the app uses for its own pages are never free.
create or replace function public.event_slug_available(p_slug text, p_event uuid default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    and char_length(p_slug) between 3 and 60
    and p_slug not in ('events', 'event', 'sign-in', 'sign-out', 'setup', 'auth', 'api', 'admin', 'me', 'embed',
                       'og', 'dev', 'new', 'settings', 'finance', 'team', 'help', 'about', 'terms', 'privacy')
    and not exists (select 1 from public.events where slug = p_slug and id is distinct from p_event);
$$;

revoke execute on function public.event_slug_available(text, uuid) from public, anon;
grant execute on function public.event_slug_available(text, uuid) to authenticated;

-- Event cover photos: event-covers/{tenant_id}/{event_id}/cover-….jpg (same rules as logos).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-covers', 'event-covers', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy event_covers_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'event-covers'
    and private.has_role(private.path_tenant(name), array['owner', 'admin']::public.member_role[])
  );
create policy event_covers_update on storage.objects for update to authenticated
  using (
    bucket_id = 'event-covers'
    and private.has_role(private.path_tenant(name), array['owner', 'admin']::public.member_role[])
  )
  with check (
    bucket_id = 'event-covers'
    and private.has_role(private.path_tenant(name), array['owner', 'admin']::public.member_role[])
  );
create policy event_covers_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'event-covers'
    and private.has_role(private.path_tenant(name), array['owner', 'admin']::public.member_role[])
  );
