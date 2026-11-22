-- Foundations: organisers (tenants), team members, events and the activity log.
-- Every table is walled per organiser with row-level security (master plan §11).

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.member_role as enum ('owner', 'admin', 'finance', 'viewer', 'judge_coordinator');
create type public.event_type as enum ('paid_voting', 'election', 'free_poll');
create type public.event_status as enum ('draft', 'scheduled', 'live', 'paused', 'closed');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  logo_path text,
  accent text check (accent ~ '^#[0-9a-fA-F]{6}$'),
  default_currency char(3) not null default 'GHS' check (default_currency ~ '^[A-Z]{3}$'),
  -- SMS add-on is switched on by the platform owner only (master plan §5).
  sms_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.tenant_members (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null,
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);
create index tenant_members_user_idx on public.tenant_members (user_id);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  type public.event_type not null,
  status public.event_status not null default 'draft',
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  -- Short text for link previews (Open Graph / X cards) and the event page.
  description text check (char_length(description) <= 200),
  -- Cover image: event page, event sign-in pages and link previews (decided 22 Nov 2026).
  cover_path text,
  logo_path text,
  accent text check (accent ~ '^#[0-9a-fA-F]{6}$'),
  currency char(3) not null default 'GHS' check (currency ~ '^[A-Z]{3}$'),
  -- Default price per vote in minor units; categories and rounds can override (master plan §3).
  price_minor bigint check (price_minor >= 0),
  opens_at timestamptz,
  closes_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closes_at is null or opens_at is null or closes_at > opens_at),
  check (type <> 'election' or price_minor is null)
);
create index events_tenant_idx on public.events (tenant_id);

-- Append-only: corrections are new entries, never edits (master plan §6).
create table public.audit_log (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null check (action ~ '^[a-z_]+(\.[a-z_]+)*$'),
  target_type text,
  target_id text,
  reason text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_tenant_idx on public.audit_log (tenant_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Helpers (security definer so policies don't recurse through tenant_members)
-- ---------------------------------------------------------------------------
create or replace function private.has_role(p_tenant uuid, p_roles public.member_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.tenant_members m
    where m.tenant_id = p_tenant
      and m.user_id = (select auth.uid())
      and m.role = any (p_roles)
  );
$$;

create or replace function private.is_member(p_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.tenant_members m
    where m.tenant_id = p_tenant and m.user_id = (select auth.uid())
  );
$$;

grant usage on schema private to authenticated, anon;
grant execute on function private.has_role(uuid, public.member_role[]) to authenticated, anon;
grant execute on function private.is_member(uuid) to authenticated, anon;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger events_touch before update on public.events
  for each row execute function private.touch_updated_at();

create or replace function private.reject_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% is append-only', tg_table_name using errcode = 'insufficient_privilege';
end;
$$;

create trigger audit_log_append_only before update or delete on public.audit_log
  for each row execute function private.reject_change();

-- An organiser can never be left without an owner.
create or replace function private.keep_one_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.role = 'owner' and (tg_op = 'DELETE' or new.role <> 'owner') then
    if not exists (
      select 1 from public.tenant_members
      where tenant_id = old.tenant_id and role = 'owner' and user_id <> old.user_id
    ) and exists (select 1 from public.tenants where id = old.tenant_id) then
      raise exception 'An organiser needs at least one owner' using errcode = 'check_violation';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger tenant_members_keep_owner before update or delete on public.tenant_members
  for each row execute function private.keep_one_owner();

-- ---------------------------------------------------------------------------
-- Actions
-- ---------------------------------------------------------------------------

-- Sign-up step "Organisation": creates the organiser and makes the caller its owner.
create or replace function public.create_tenant(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_id uuid;
begin
  if v_user is null then
    raise exception 'Sign in first' using errcode = 'insufficient_privilege';
  end if;
  insert into public.tenants (name) values (trim(p_name)) returning id into v_id;
  insert into public.tenant_members (tenant_id, user_id, role) values (v_id, v_user, 'owner');
  insert into public.audit_log (tenant_id, actor_id, action, target_type, target_id)
    values (v_id, v_user, 'tenant.created', 'tenant', v_id::text);
  return v_id;
end;
$$;

-- Any team member can record an activity entry for their own organiser, as themselves.
create or replace function public.log_activity(
  p_tenant uuid, p_action text, p_target_type text default null, p_target_id text default null,
  p_reason text default null, p_data jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
begin
  if not private.is_member(p_tenant) then
    raise exception 'Not a member of this organiser' using errcode = 'insufficient_privilege';
  end if;
  insert into public.audit_log (tenant_id, actor_id, action, target_type, target_id, reason, data)
    values (p_tenant, (select auth.uid()), p_action, p_target_type, p_target_id, p_reason, coalesce(p_data, '{}'::jsonb))
    returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.create_tenant(text) from public, anon;
revoke execute on function public.log_activity(uuid, text, text, text, text, jsonb) from public, anon;
grant execute on function public.create_tenant(text) to authenticated;
grant execute on function public.log_activity(uuid, text, text, text, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.tenants enable row level security;
alter table public.tenant_members enable row level security;
alter table public.events enable row level security;
alter table public.audit_log enable row level security;

-- tenants: members read; owners and admins edit name, logo, accent. New organisers only via create_tenant().
create policy tenants_select on public.tenants for select to authenticated
  using (private.is_member(id));
create policy tenants_update on public.tenants for update to authenticated
  using (private.has_role(id, array['owner', 'admin']::public.member_role[]))
  with check (private.has_role(id, array['owner', 'admin']::public.member_role[]));
-- The SMS add-on is the platform owner's switch, never the organiser's: only these columns are editable.
revoke insert, update, delete, truncate on public.tenants from authenticated, anon;
grant update (name, logo_path, accent, default_currency) on public.tenants to authenticated;
revoke all on public.tenants from anon;

-- tenant_members: members see their team. Owners manage everyone; admins manage non-owners.
create policy members_select on public.tenant_members for select to authenticated
  using (private.is_member(tenant_id));
create policy members_insert on public.tenant_members for insert to authenticated
  with check (
    private.has_role(tenant_id, array['owner']::public.member_role[])
    or (role <> 'owner' and private.has_role(tenant_id, array['admin']::public.member_role[]))
  );
create policy members_update on public.tenant_members for update to authenticated
  using (
    private.has_role(tenant_id, array['owner']::public.member_role[])
    or (role <> 'owner' and private.has_role(tenant_id, array['admin']::public.member_role[]))
  )
  with check (
    private.has_role(tenant_id, array['owner']::public.member_role[])
    or (role <> 'owner' and private.has_role(tenant_id, array['admin']::public.member_role[]))
  );
create policy members_delete on public.tenant_members for delete to authenticated
  using (
    private.has_role(tenant_id, array['owner']::public.member_role[])
    or (role <> 'owner' and private.has_role(tenant_id, array['admin']::public.member_role[]))
  );

-- events: the team reads all of its events; anyone reads published ones (for event pages and link previews).
create policy events_select_team on public.events for select to authenticated
  using (private.is_member(tenant_id));
create policy events_select_public on public.events for select to anon, authenticated
  using (status <> 'draft');
create policy events_insert on public.events for insert to authenticated
  with check (private.has_role(tenant_id, array['owner', 'admin']::public.member_role[]));
create policy events_update on public.events for update to authenticated
  using (private.has_role(tenant_id, array['owner', 'admin']::public.member_role[]))
  with check (private.has_role(tenant_id, array['owner', 'admin']::public.member_role[]));
create policy events_delete on public.events for delete to authenticated
  using (status = 'draft' and private.has_role(tenant_id, array['owner']::public.member_role[]));
-- An event never moves to another organiser: tenant_id, id and created_at are not editable.
revoke update, truncate on public.events from authenticated, anon;
revoke insert, delete on public.events from anon;
grant update (type, status, name, slug, description, cover_path, logo_path, accent, currency, price_minor, opens_at, closes_at)
  on public.events to authenticated;
revoke all on public.tenant_members from anon;
revoke truncate, trigger, references on public.tenant_members from authenticated;
revoke trigger, references on public.tenants, public.events, public.audit_log from authenticated, anon;

-- audit_log: owners and admins read; writes only through log_activity() and other server functions.
create policy audit_select on public.audit_log for select to authenticated
  using (private.has_role(tenant_id, array['owner', 'admin']::public.member_role[]));
revoke insert, update, delete, truncate on public.audit_log from authenticated;
revoke all on public.audit_log from anon;
