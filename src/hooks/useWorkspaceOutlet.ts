import { useOutletContext } from 'react-router-dom'
import type { WorkspaceOutletContext } from '../app/layouts/workspaceOutletContext'

export function useWorkspaceOutlet() {
  return useOutletContext<WorkspaceOutletContext>()
}
