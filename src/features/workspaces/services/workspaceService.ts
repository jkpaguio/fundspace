import { supabase } from '../../../lib/supabase'
import type {
  CurrencyCode,
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

export async function listWorkspaces() {
  const { data, error } = await supabase
    .from('workspaces')
    .select(
      'id, name, type, owner_id, currency, created_at, updated_at, workspace_members(role, status)',
    )
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []).map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    type: workspace.type,
    owner_id: workspace.owner_id,
    currency: workspace.currency,
    created_at: workspace.created_at,
    updated_at: workspace.updated_at,
    membership: workspace.workspace_members?.[0] ?? null,
  })) as WorkspaceWithMembership[]
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
  const { data, error } = await supabase
    .from('workspace_members')
    .select('id, workspace_id, user_id, role, status, invited_by, created_at, updated_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []) as WorkspaceMember[]
}

export async function listWorkspaceProfiles(workspaceId: string) {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('user_id, profiles(id, full_name)')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')

  if (error) {
    throw error
  }

  return (data ?? [])
    .map((entry) => {
      const profile = Array.isArray(entry.profiles) ? entry.profiles[0] : entry.profiles

      if (!profile) {
        return null
      }

      return {
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

export async function acceptWorkspaceInvite(workspaceId: string) {
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
