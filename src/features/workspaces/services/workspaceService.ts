import { supabase } from '../../../lib/supabase'
import type {
  CurrencyCode,
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
  WorkspaceType,
} from '../../../types/domain'

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
