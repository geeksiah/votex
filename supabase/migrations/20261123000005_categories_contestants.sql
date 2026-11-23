-- Categories (O6) and contestants (O7). A contestant can be in several categories; votes count separately
-- in each (master plan §3, decided in O7). Codes are made automatically, unique per event.

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  group_name text check (char_length(group_name) <= 60),
  position integer not null default 0,
  -- Own price per vote; null uses the round or event price (category, then round, then event).
  price_minor bigint check (price_minor > 0),
  visible boolean not null default true,
  -- Deleting keeps the row for 30 days so it can be undone (Figma "Bulk · Confirm delete").
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create index categories_event_idx on public.categories (event_id, position);
-- Names are unique among the categories that are not deleted.
create unique index categories_event_name on public.categories (event_id, lower(name)) where deleted_at is null;

create table public.contestants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  code text not null check (code ~ '^[A-Z0-9]+(-[A-Z0-9]+)*$' and char_length(code) <= 16),
  photo_path text,
  created_at timestamptz not null default now(),
  unique (event_id, code)
);
create index contestants_event_idx on public.contestants (event_id);

create table public.category_entries (
  category_id uuid not null references public.categories (id) on delete cascade,
  contestant_id uuid not null references public.contestants (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (category_id, contestant_id)
);
create index category_entries_contestant_idx on public.category_entries (contestant_id);

-- Rows always belong to the same organiser as their event; an entry links a category and a contestant
-- of the same event.
create or replace function private.event_tenant_matches()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.events e where e.id = new.event_id and e.tenant_id = new.tenant_id) then
    raise exception 'Row and event belong to different organisers' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger categories_tenant_matches before insert or update on public.categories
  for each row execute function private.event_tenant_matches();

-- Contestant codes: the event's initials and a number, e.g. AMA-001, when none is given.
create or replace function private.contestant_code()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_prefix text;
  v_next integer;
begin
  if not exists (select 1 from public.events e where e.id = new.event_id and e.tenant_id = new.tenant_id) then
    raise exception 'Row and event belong to different organisers' using errcode = 'check_violation';
  end if;
  if new.code is null or new.code = '' then
    select upper(left(string_agg(left(w, 1), ''), 3)) into v_prefix
      from (select w from regexp_split_to_table((select name from public.events where id = new.event_id), '[^A-Za-z]+') as w
            where w <> '') s;
    v_prefix := coalesce(nullif(v_prefix, ''), 'VX');
    select coalesce(max((regexp_match(code, '-(\d+)$'))[1]::integer), 0) + 1 into v_next
      from public.contestants where event_id = new.event_id and code like v_prefix || '-%';
    new.code := v_prefix || '-' || lpad(v_next::text, 3, '0');
  end if;
  return new;
end;
$$;

create trigger contestants_code before insert or update on public.contestants
  for each row execute function private.contestant_code();

create or replace function private.entry_matches()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.categories c join public.contestants p on p.event_id = c.event_id
    where c.id = new.category_id and p.id = new.contestant_id and c.tenant_id = new.tenant_id and p.tenant_id = new.tenant_id
  ) then
    raise exception 'Category and contestant belong to different events' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger category_entries_match before insert or update on public.category_entries
  for each row execute function private.entry_matches();

-- Row-level security: the team reads; owners and admins change; published events are public
-- (hidden categories stay private).
alter table public.categories enable row level security;
alter table public.contestants enable row level security;
alter table public.category_entries enable row level security;

grant select on public.categories, public.contestants, public.category_entries to anon, authenticated;
grant insert, delete on public.categories, public.contestants, public.category_entries to authenticated;
grant update (name, group_name, position, price_minor, visible, deleted_at) on public.categories to authenticated;
grant update (name, code, photo_path) on public.contestants to authenticated;
revoke truncate, trigger, references on public.categories, public.contestants, public.category_entries from authenticated, anon;

create policy categories_select_team on public.categories for select to authenticated using (private.is_member(tenant_id));
create policy categories_select_public on public.categories for select to anon, authenticated
  using (visible and deleted_at is null and exists (select 1 from public.events e where e.id = event_id and e.status <> 'draft'));
create policy categories_write on public.categories for insert to authenticated
  with check (private.has_role(tenant_id, array['owner', 'admin']::public.member_role[]));
create policy categories_update on public.categories for update to authenticated
  using (private.has_role(tenant_id, array['owner', 'admin']::public.member_role[]))
  with check (private.has_role(tenant_id, array['owner', 'admin']::public.member_role[]));
create policy categories_delete on public.categories for delete to authenticated
  using (private.has_role(tenant_id, array['owner', 'admin']::public.member_role[]));

create policy contestants_select_team on public.contestants for select to authenticated using (private.is_member(tenant_id));
-- Public pages show contestants of published events. Contact details live in contestant_contacts (team only).
create policy contestants_select_public on public.contestants for select to anon, authenticated
  using (exists (select 1 from public.events e where e.id = event_id and e.status <> 'draft'));
create policy contestants_write on public.contestants for insert to authenticated
  with check (private.has_role(tenant_id, array['owner', 'admin']::public.member_role[]));
create policy contestants_update on public.contestants for update to authenticated
  using (private.has_role(tenant_id, array['owner', 'admin']::public.member_role[]))
  with check (private.has_role(tenant_id, array['owner', 'admin']::public.member_role[]));
create policy contestants_delete on public.contestants for delete to authenticated
  using (private.has_role(tenant_id, array['owner', 'admin']::public.member_role[]));

-- Contestants' email and phone (for the contestant portal invite): only the organiser's team reads them.
create table public.contestant_contacts (
  contestant_id uuid primary key references public.contestants (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  email text check (char_length(email) <= 254),
  phone text check (char_length(phone) <= 20)
);
alter table public.contestant_contacts enable row level security;
grant select, insert, delete on public.contestant_contacts to authenticated;
grant update (email, phone) on public.contestant_contacts to authenticated;
revoke all on public.contestant_contacts from anon;
create policy contacts_select on public.contestant_contacts for select to authenticated
  using (private.has_role(tenant_id, array['owner', 'admin']::public.member_role[]));
create policy contacts_write on public.contestant_contacts for insert to authenticated
  with check (
    private.has_role(tenant_id, array['owner', 'admin']::public.member_role[])
    and exists (select 1 from public.contestants c where c.id = contestant_id and c.tenant_id = contestant_contacts.tenant_id)
  );
create policy contacts_update on public.contestant_contacts for update to authenticated
  using (private.has_role(tenant_id, array['owner', 'admin']::public.member_role[]))
  with check (private.has_role(tenant_id, array['owner', 'admin']::public.member_role[]));
create policy contacts_delete on public.contestant_contacts for delete to authenticated
  using (private.has_role(tenant_id, array['owner', 'admin']::public.member_role[]));

create policy entries_select_team on public.category_entries for select to authenticated using (private.is_member(tenant_id));
create policy entries_select_public on public.category_entries for select to anon, authenticated
  using (exists (
    select 1 from public.categories c join public.events e on e.id = c.event_id
    where c.id = category_id and c.visible and c.deleted_at is null and e.status <> 'draft'
  ));
create policy entries_write on public.category_entries for insert to authenticated
  with check (private.has_role(tenant_id, array['owner', 'admin']::public.member_role[]));
create policy entries_delete on public.category_entries for delete to authenticated
  using (private.has_role(tenant_id, array['owner', 'admin']::public.member_role[]));

-- Contestant photos: contestant-photos/{tenant_id}/{event_id}/….jpg, same rules as logos and covers.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('contestant-photos', 'contestant-photos', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy contestant_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'contestant-photos' and private.has_role(private.path_tenant(name), array['owner', 'admin']::public.member_role[]));
create policy contestant_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'contestant-photos' and private.has_role(private.path_tenant(name), array['owner', 'admin']::public.member_role[]))
  with check (bucket_id = 'contestant-photos' and private.has_role(private.path_tenant(name), array['owner', 'admin']::public.member_role[]));
create policy contestant_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'contestant-photos' and private.has_role(private.path_tenant(name), array['owner', 'admin']::public.member_role[]));
