create or replace function public.update_workspace_settings(
  target_workspace_id uuid,
  workspace_name text,
  workspace_type text,
  workspace_currency text
)
returns public.workspaces
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_workspace public.workspaces;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if workspace_type not in ('personal', 'family', 'business', 'side_hustle', 'other') then
    raise exception 'Invalid workspace type';
  end if;

  if not public.can_manage_workspace_members(target_workspace_id) then
    raise exception 'Not allowed to update this workspace';
  end if;

  update public.workspaces
  set
    name = workspace_name,
    type = workspace_type,
    currency = workspace_currency
  where id = target_workspace_id
  returning * into updated_workspace;

  if updated_workspace.id is null then
    raise exception 'Workspace not found';
  end if;

  perform public.log_activity(
    updated_workspace.id,
    'updated_workspace_settings',
    'workspace',
    updated_workspace.id,
    'Updated workspace settings'
  );

  return updated_workspace;
end;
$$;

create or replace function public.remove_workspace_member(
  target_membership_id uuid
)
returns public.workspace_members
language plpgsql
security definer
set search_path = public
as $$
declare
  current_member public.workspace_members;
  updated_member public.workspace_members;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into current_member
  from public.workspace_members
  where id = target_membership_id;

  if current_member.id is null then
    raise exception 'Membership not found';
  end if;

  if not public.can_manage_workspace_members(current_member.workspace_id) then
    raise exception 'Not allowed to remove this member';
  end if;

  if current_member.role = 'owner' then
    raise exception 'Owner cannot be removed';
  end if;

  update public.workspace_members
  set status = 'removed'
  where id = target_membership_id
  returning * into updated_member;

  perform public.log_activity(
    updated_member.workspace_id,
    'removed_member',
    'workspace_member',
    updated_member.id,
    'Removed a workspace member'
  );

  return updated_member;
end;
$$;

create or replace function public.delete_workspace_with_safeguards(
  target_workspace_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_workspace public.workspaces;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into target_workspace
  from public.workspaces
  where id = target_workspace_id;

  if target_workspace.id is null then
    raise exception 'Workspace not found';
  end if;

  if target_workspace.owner_id <> auth.uid() then
    raise exception 'Only the workspace owner can delete this workspace';
  end if;

  delete from public.workspaces
  where id = target_workspace_id;

  return target_workspace_id;
end;
$$;
