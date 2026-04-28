import type { WorkspaceRole } from '../types/domain'

export function canManageWorkspaceMembers(role?: WorkspaceRole | null) {
  return role === 'owner' || role === 'admin'
}

export function canManageWorkspaceData(role?: WorkspaceRole | null) {
  return role === 'owner' || role === 'admin' || role === 'editor'
}

export function isReadOnlyRole(role?: WorkspaceRole | null) {
  return role === 'viewer'
}
