import { getIsOnline } from './connectivity'
import {
  countOpenSyncConflicts,
  countPendingSyncOperations,
} from './syncStore'
import type { AppSyncStatus, SyncStatusSnapshot } from './types'

const listeners = new Set<() => void>()

let snapshot: SyncStatusSnapshot = {
  conflictCount: 0,
  isOnline: getIsOnline(),
  lastError: null,
  lastSyncedAt: null,
  pendingCount: 0,
  status: getIsOnline() ? 'synced' : 'offline',
}

export function getSyncStatusSnapshot() {
  return snapshot
}

export function subscribeToSyncStatus(listener: () => void) {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function setSyncStatusSnapshot(nextSnapshot: Partial<SyncStatusSnapshot>) {
  snapshot = {
    ...snapshot,
    ...nextSnapshot,
  }

  listeners.forEach((listener) => listener())
}

export function setSyncStatus(status: AppSyncStatus, input: Partial<SyncStatusSnapshot> = {}) {
  setSyncStatusSnapshot({
    ...input,
    status,
  })
}

export async function refreshSyncStatusCounts() {
  const [pendingCount, conflictCount] = await Promise.all([
    countPendingSyncOperations(),
    countOpenSyncConflicts(),
  ])

  setSyncStatusSnapshot({
    conflictCount,
    pendingCount,
  })

  return { conflictCount, pendingCount }
}
