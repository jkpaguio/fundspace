import { useCallback, useEffect, useState } from 'react'
import { listWorkspaces, type WorkspaceWithMembership } from '../features/workspaces/services/workspaceService'

const SELECTED_WORKSPACE_KEY = 'fundspace:selected-workspace-id'

export function getStoredWorkspaceId() {
  return window.localStorage.getItem(SELECTED_WORKSPACE_KEY)
}

export function setStoredWorkspaceId(workspaceId: string) {
  window.localStorage.setItem(SELECTED_WORKSPACE_KEY, workspaceId)
}

export function useWorkspaceSelection() {
  const [workspaces, setWorkspaces] = useState<WorkspaceWithMembership[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(
    getStoredWorkspaceId(),
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const selectedWorkspace =
    workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ??
    workspaces[0] ??
    null

  const loadWorkspaces = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const nextWorkspaces = await listWorkspaces()
      setWorkspaces(nextWorkspaces)

      const storedWorkspace = getStoredWorkspaceId()
      const nextSelected =
        nextWorkspaces.find((workspace) => workspace.id === storedWorkspace) ??
        nextWorkspaces[0] ??
        null

      if (nextSelected) {
        setSelectedWorkspaceId(nextSelected.id)
        setStoredWorkspaceId(nextSelected.id)
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load workspaces.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const selectWorkspace = (workspaceId: string) => {
    setSelectedWorkspaceId(workspaceId)
    setStoredWorkspaceId(workspaceId)
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadWorkspaces()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadWorkspaces])

  return {
    error,
    isLoading,
    loadWorkspaces,
    selectedWorkspace,
    selectWorkspace,
    workspaces,
  }
}
