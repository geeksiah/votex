-- Image storage for organisers and events. Files sit under a folder named after the organiser:
--   tenant-logos/{tenant_id}/logo-….png
-- Anyone can view them (they appear on public event pages and link previews); only the organiser's
-- owners and admins can add, replace or remove them.

-- The organiser id from the first folder of a storage path, or null when it is not a valid id.
create or replace function private.path_tenant(p_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_first text := split_part(p_name, '/', 1);
begin
  if v_first ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return v_first::uuid;
  end if;
  return null;
end;
$$;

grant execute on function private.path_tenant(text) to authenticated, anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tenant-logos', 'tenant-logos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy tenant_logos_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'tenant-logos'
    and private.has_role(private.path_tenant(name), array['owner', 'admin']::public.member_role[])
  );
create policy tenant_logos_update on storage.objects for update to authenticated
  using (
    bucket_id = 'tenant-logos'
    and private.has_role(private.path_tenant(name), array['owner', 'admin']::public.member_role[])
  )
  with check (
    bucket_id = 'tenant-logos'
    and private.has_role(private.path_tenant(name), array['owner', 'admin']::public.member_role[])
  );
create policy tenant_logos_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'tenant-logos'
    and private.has_role(private.path_tenant(name), array['owner', 'admin']::public.member_role[])
  );
