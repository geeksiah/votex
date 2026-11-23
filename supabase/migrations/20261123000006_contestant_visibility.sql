-- Contestants can be shown or hidden (O7 "Status": Shown / Hidden) and deleted with 30 days to undo,
-- like categories (Figma "Pattern · Bulk select").

alter table public.contestants
  add column visible boolean not null default true,
  add column deleted_at timestamptz;

grant update (visible, deleted_at) on public.contestants to authenticated;

-- Visitors see shown contestants of published events only.
drop policy contestants_select_public on public.contestants;
create policy contestants_select_public on public.contestants for select to anon, authenticated
  using (visible and deleted_at is null and exists (select 1 from public.events e where e.id = event_id and e.status <> 'draft'));

-- A deleted contestant's code can be used again.
alter table public.contestants drop constraint contestants_event_id_code_key;
create unique index contestants_event_code on public.contestants (event_id, code) where deleted_at is null;
