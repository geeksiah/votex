-- Organiser onboarding (O1 "Name your organisation", "Add your logo and colour").
-- Country and main currency are chosen when the organiser is created; logos live in Storage.

alter table public.tenants
  add column country char(2) not null default 'GH' check (country ~ '^[A-Z]{2}$');

grant update (country) on public.tenants to authenticated;

-- create_tenant now takes the country and main currency from onboarding step 1.
drop function public.create_tenant(text);

create function public.create_tenant(p_name text, p_country text default 'GH', p_currency text default 'GHS')
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
  insert into public.tenants (name, country, default_currency)
    values (trim(p_name), upper(p_country), upper(p_currency))
    returning id into v_id;
  insert into public.tenant_members (tenant_id, user_id, role) values (v_id, v_user, 'owner');
  insert into public.audit_log (tenant_id, actor_id, action, target_type, target_id)
    values (v_id, v_user, 'tenant.created', 'tenant', v_id::text);
  return v_id;
end;
$$;

revoke execute on function public.create_tenant(text, text, text) from public, anon;
grant execute on function public.create_tenant(text, text, text) to authenticated;
