import type { WorkspaceWithMembership } from '../../features/workspaces/services/workspaceService'

export type WorkspaceOutletContext = {
  error: string
  isLoading: boolean
  loadWorkspaces: () => Promise<void>
  selectedWorkspace: WorkspaceWithMembership | null
  selectWorkspace: (workspaceId: string) => void
  workspaces: WorkspaceWithMembership[]
}
