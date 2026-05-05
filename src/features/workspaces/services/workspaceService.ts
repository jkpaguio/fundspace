import { supabase } from '../../../lib/supabase'
import { cacheServerRecords, getIsOnline, readCachedRecords, requireOnline } from '../../../lib/offline'
import type {
  CurrencyCode,
  MemberSearchResult,
  Workspace,
  WorkspaceMember,
  WorkspaceProfile,
  WorkspaceRole,
  WorkspaceType,
} from '../../../types/domain'
import { listAccounts } from '../../accounts/services/accountService'
import { listActivityLogs } from '../../activity/services/activityService'

export type WorkspaceWithMembership = Workspace & {
  membership: Pick<WorkspaceMember, 'role' | 'status'> | null
}

export type WorkspaceMemberWithProfile = WorkspaceMember & {
  email: string | null
  full_name: string | null
}

export async function listWorkspaces() {
  const cachedWorkspaces = await readCachedRecords<Workspace>('workspaces', undefined, (first, second) =>
    first.created_at.localeCompare(second.created_at),
  )

  if (!getIsOnline()) {
    return cachedWorkspaces.map((workspace) => ({
      ...workspace,
      membership: null,
    })) as WorkspaceWithMembership[]
  }

  try {
    const { data, error } = await supabase
      .from('workspaces')
      .select(
        'id, name, type, owner_id, currency, created_at, updated_at, workspace_members(role, status)',
      )
      .order('created_at', { ascending: true })

    if (error) {
      throw error
    }

    const workspaces = (data ?? []).map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      type: workspace.type,
      owner_id: workspace.owner_id,
      currency: workspace.currency,
      created_at: workspace.created_at,
      updated_at: workspace.updated_at,
      membership: workspace.workspace_members?.[0] ?? null,
    })) as WorkspaceWithMembership[]

    await cacheServerRecords(
      'workspaces',
      workspaces.map(({ membership: _membership, ...workspace }) => workspace),
    )

    return workspaces
  } catch (error) {
    if (cachedWorkspaces.length > 0) {
      return cachedWorkspaces.map((workspace) => ({
        ...workspace,
        membership: null,
      })) as WorkspaceWithMembership[]
    }

    throw error
  }
}

export async function createWorkspace(input: {
  currency: CurrencyCode
  name: string
  type: WorkspaceType
}) {
  const { data, error } = await supabase.rpc('create_workspace_with_owner', {
    workspace_currency: input.currency,
    workspace_name: input.name,
    workspace_type: input.type,
  })

  if (error) {
    throw error
  }

  return data as Workspace
}

export async function listWorkspaceMembers(workspaceId: string) {
  const cachedMembers = await readCachedRecords<WorkspaceMemberWithProfile>(
    'workspace_members',
    (member) => member.workspace_id === workspaceId,
    (first, second) => first.created_at.localeCompare(second.created_at),
  )

  if (!getIsOnline()) {
    return cachedMembers
  }

  const { data, error } = await supabase.rpc('list_workspace_member_directory', {
    target_workspace_id: workspaceId,
  })

  if (error) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('workspace_members')
      .select('id, workspace_id, user_id, role, status, invited_by, created_at, updated_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true })

    if (fallbackError) {
      throw fallbackError
    }

    const members = (fallbackData ?? []).map((member) => ({
      email: null,
      ...member,
      full_name: null,
    })) as WorkspaceMemberWithProfile[]

    await cacheServerRecords('workspace_members', members)

    return members
  }

  const members = (data ?? []) as WorkspaceMemberWithProfile[]

  await cacheServerRecords('workspace_members', members)

  return members
}

export async function listWorkspaceProfiles(workspaceId: string) {
  try {
    const members = await listWorkspaceMembers(workspaceId)

    return members
      .filter((member) => member.status === 'active')
      .map((member) => ({
        email: member.email,
        full_name: member.full_name,
        id: member.user_id,
      })) satisfies WorkspaceProfile[]
  } catch {
    // Fall back to the older direct join below when the member directory RPC is unavailable.
  }

  const { data, error } = await supabase
    .from('workspace_members')
    .select('user_id, profiles(id, full_name, email)')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')

  if (error) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')

    if (fallbackError) {
      throw fallbackError
    }

    return (fallbackData ?? []).map((entry) => ({
      email: null,
      full_name: null,
      id: entry.user_id,
    }))
  }

  return (data ?? [])
    .map((entry) => {
      const profile = Array.isArray(entry.profiles) ? entry.profiles[0] : entry.profiles

      if (!profile) {
        return null
      }

      return {
        email: profile.email ?? null,
        full_name: profile.full_name,
        id: profile.id,
      }
    })
    .filter((profile): profile is WorkspaceProfile => Boolean(profile))
}

export async function addWorkspaceMember(input: {
  workspaceId: string
  userId: string
  role: WorkspaceRole
}) {
  requireOnline('Inviting members')

  const { error } = await supabase.from('workspace_members').insert({
    workspace_id: input.workspaceId,
    user_id: input.userId,
    role: input.role,
    status: 'invited',
  })

  if (error) {
    throw error
  }
}

export async function searchWorkspaceInvitableProfiles(input: {
  query: string
  workspaceId: string
}) {
  requireOnline('Member search')

  const { data, error } = await supabase.rpc('search_workspace_invitable_profiles', {
    search_query: input.query,
    target_workspace_id: input.workspaceId,
  })

  if (error) {
    if (error.code === 'PGRST202') {
      throw new Error(
        'Member search is not available yet because the workspace member search migration is missing from the connected Supabase database.',
      )
    }

    throw error
  }

  return (data ?? []) as MemberSearchResult[]
}

export async function acceptWorkspaceInvite(workspaceId: string) {
  requireOnline('Accepting invites')

  const { data, error } = await supabase.rpc('accept_workspace_invite', {
    target_workspace_id: workspaceId,
  })

  if (error) {
    throw error
  }

  return data as WorkspaceMember
}

export async function updateWorkspaceMemberRole(input: {
  membershipId: string
  role: Exclude<WorkspaceRole, 'owner'>
}) {
  const { data, error } = await supabase.rpc('update_workspace_member_role', {
    next_role: input.role,
    target_membership_id: input.membershipId,
  })

  if (error) {
    throw error
  }

  return data as WorkspaceMember
}

export async function updateWorkspaceSettings(input: {
  currency: CurrencyCode
  name: string
  type: WorkspaceType
  workspaceId: string
}) {
  const { data, error } = await supabase.rpc('update_workspace_settings', {
    target_workspace_id: input.workspaceId,
    workspace_currency: input.currency,
    workspace_name: input.name,
    workspace_type: input.type,
  })

  if (error) {
    throw error
  }

  return data as Workspace
}

export async function removeWorkspaceMember(membershipId: string) {
  const { data, error } = await supabase.rpc('remove_workspace_member', {
    target_membership_id: membershipId,
  })

  if (error) {
    throw error
  }

  return data as WorkspaceMember
}

export async function deleteWorkspace(workspaceId: string) {
  const { data, error } = await supabase.rpc('delete_workspace_with_safeguards', {
    target_workspace_id: workspaceId,
  })

  if (error) {
    throw error
  }

  return data as string
}

export async function loadWorkspaceSummary(workspaceId: string) {
  const [accounts, activityLogs, members] = await Promise.all([
    listAccounts(workspaceId),
    listActivityLogs(workspaceId),
    listWorkspaceMembers(workspaceId),
  ])

  return {
    accounts,
    activityLogs,
    members,
    totalBalance: accounts.reduce((total, account) => total + account.current_balance, 0),
  }
}
