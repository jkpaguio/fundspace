import { useEffect, useSyncExternalStore } from 'react'
import {
  getSyncStatusSnapshot,
  refreshSyncStatusCounts,
  subscribeToSyncStatus,
} from '../lib/offline/syncStatusStore'
import { startAutoSync } from '../lib/offline/syncEngine'
import { registerDefaultReplayHandlers } from '../lib/offline/defaultReplayHandlers'

export function useSyncStatus() {
  const snapshot = useSyncExternalStore(
    subscribeToSyncStatus,
    getSyncStatusSnapshot,
    getSyncStatusSnapshot,
  )

  useEffect(() => {
    registerDefaultReplayHandlers()

    const stopAutoSync = startAutoSync()

    void refreshSyncStatusCounts()

    return stopAutoSync
  }, [])

  return snapshot
}
