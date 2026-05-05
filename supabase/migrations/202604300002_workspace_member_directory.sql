create or replace function public.list_workspace_member_directory(
  target_workspace_id uuid
)
returns table (
  id uuid,
  workspace_id uuid,
  user_id uuid,
  role text,
  status text,
  invited_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  full_name text,
  email text
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_workspace_member(target_workspace_id) then
    raise exception 'Not allowed to view members for this space';
  end if;

  return query
  select
    wm.id,
    wm.workspace_id,
    wm.user_id,
    wm.role,
    wm.status,
    wm.invited_by,
    wm.created_at,
    wm.updated_at,
    p.full_name,
    u.email::text
  from public.workspace_members wm
  left join public.profiles p
    on p.id = wm.user_id
  left join auth.users u
    on u.id = wm.user_id
  where wm.workspace_id = target_workspace_id
  order by wm.created_at asc;
end;
$$;
