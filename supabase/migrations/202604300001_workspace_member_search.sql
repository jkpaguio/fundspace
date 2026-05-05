create or replace function public.search_workspace_invitable_profiles(
  target_workspace_id uuid,
  search_query text
)
returns table (
  id uuid,
  full_name text,
  email text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  normalized_query text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.can_manage_workspace_members(target_workspace_id) then
    raise exception 'Not allowed to search members for this space';
  end if;

  normalized_query := trim(coalesce(search_query, ''));

  if char_length(normalized_query) < 2 then
    return;
  end if;

  return query
  select
    p.id,
    p.full_name,
    u.email::text
  from public.profiles p
  join auth.users u
    on u.id = p.id
  where (
    coalesce(p.full_name, '') ilike '%' || normalized_query || '%'
    or coalesce(u.email, '') ilike '%' || normalized_query || '%'
  )
    and p.id <> auth.uid()
    and not exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = target_workspace_id
        and wm.user_id = p.id
        and wm.status in ('active', 'invited')
    )
  order by
    case
      when coalesce(p.full_name, '') ilike normalized_query || '%' then 0
      when coalesce(u.email, '') ilike normalized_query || '%' then 1
      else 2
    end,
    coalesce(p.full_name, ''),
    coalesce(u.email, '')
  limit 10;
end;
$$;
