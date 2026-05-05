import { supabase } from '../supabase'
import { getIsOnline, subscribeToConnectivity } from './connectivity'
import { openOfflineDatabase } from './database'
import {
  createSyncConflict,
  listPendingSyncOperations,
  removeSyncOperation,
  setSyncMeta,
  updateSyncOperationStatus,
} from './syncStore'
import {
  getSyncStatusSnapshot,
  refreshSyncStatusCounts,
  setSyncStatus,
  setSyncStatusSnapshot,
} from './syncStatusStore'
import type {
  LocalMirrorTableName,
  SyncOutboxItem,
  SyncStatusSnapshot,
} from './types'

type SyncContext = {
  isOnline: () => boolean
  userId: string
}

export type ServerRecordSnapshot = {
  updated_at?: string | null
  [key: string]: unknown
}

export type PullHandler = (context: SyncContext) => Promise<void>

export type ReplayHandler = {
  getServerRecord?: (
    item: SyncOutboxItem,
    context: SyncContext,
  ) => Promise<ServerRecordSnapshot | null>
  replay: (item: SyncOutboxItem, context: SyncContext) => Promise<void>
}

const pullHandlers = new Map<string, PullHandler>()
const replayHandlers = new Map<LocalMirrorTableName, ReplayHandler>()

let isSyncRunning = false
let isAutoSyncStarted = false

export class SyncConflictError extends Error {
  serverPayload: unknown

  constructor(message: string, serverPayload: unknown = null) {
    super(message)
    this.name = 'SyncConflictError'
    this.serverPayload = serverPayload
  }
}

export function registerPullHandler(key: string, handler: PullHandler) {
  pullHandlers.set(key, handler)

  return () => {
    pullHandlers.delete(key)
  }
}

export function registerReplayHandler(tableName: LocalMirrorTableName, handler: ReplayHandler) {
  replayHandlers.set(tableName, handler)

  return () => {
    replayHandlers.delete(tableName)
  }
}

async function getSignedInUserId() {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    throw error
  }

  return data.session?.user.id ?? null
}

function hasServerConflict(item: SyncOutboxItem, serverRecord: ServerRecordSnapshot | null) {
  if (!serverRecord?.updated_at || !item.base_server_updated_at) {
    return false
  }

  return serverRecord.updated_at !== item.base_server_updated_at
}

async function replayOperation(item: SyncOutboxItem, context: SyncContext) {
  const handler = replayHandlers.get(item.table_name)

  if (!handler) {
    await updateSyncOperationStatus(
      item.id,
      'failed',
      `No sync replay handler registered for ${item.table_name}.`,
    )
    return
  }

  await updateSyncOperationStatus(item.id, 'syncing')

  try {
    const serverRecord = handler.getServerRecord
      ? await handler.getServerRecord(item, context)
      : null

    if (hasServerConflict(item, serverRecord)) {
      await createSyncConflict({
        localPayload: item.payload,
        outboxId: item.id,
        reason: 'Server has a newer version. Server data was kept.',
        recordId: item.record_id,
        serverPayload: serverRecord,
        tableName: item.table_name,
        workspaceId: item.workspace_id,
      })
      return
    }

    await handler.replay(item, context)
    await removeSyncOperation(item.id)
  } catch (error) {
    if (error instanceof SyncConflictError) {
      await createSyncConflict({
        localPayload: item.payload,
        outboxId: item.id,
        reason: error.message,
        recordId: item.record_id,
        serverPayload: error.serverPayload,
        tableName: item.table_name,
        workspaceId: item.workspace_id,
      })
      return
    }

    await updateSyncOperationStatus(
      item.id,
      'failed',
      error instanceof Error ? error.message : 'Unable to sync this item.',
    )
  }
}

export async function runSyncNow(reason = 'manual'): Promise<SyncStatusSnapshot> {
  await openOfflineDatabase()

  if (!getIsOnline()) {
    setSyncStatus('offline', {
      isOnline: false,
      lastError: null,
    })
    await refreshSyncStatusCounts()
    return getSyncStatusSnapshot()
  }

  if (isSyncRunning) {
    return setAndReturnCurrentStatus()
  }

  isSyncRunning = true

  try {
    const userId = await getSignedInUserId()

    if (!userId) {
      setSyncStatus('synced', {
        isOnline: true,
        lastError: null,
      })
      await refreshSyncStatusCounts()
      return setAndReturnCurrentStatus()
    }

    const context: SyncContext = {
      isOnline: getIsOnline,
      userId,
    }

    setSyncStatus('syncing', {
      isOnline: true,
      lastError: null,
    })

    for (const handler of pullHandlers.values()) {
      if (!context.isOnline()) {
        break
      }

      await handler(context)
    }

    const pendingOperations = await listPendingSyncOperations()

    for (const operation of pendingOperations) {
      if (!context.isOnline()) {
        break
      }

      await replayOperation(operation, context)
    }

    const { conflictCount, pendingCount } = await refreshSyncStatusCounts()
    const lastSyncedAt = new Date().toISOString()

    await setSyncMeta('last_sync_reason', reason)
    await setSyncMeta('last_sync_at', lastSyncedAt)

    setSyncStatus(conflictCount > 0 || pendingCount > 0 ? 'needs_attention' : 'synced', {
      conflictCount,
      isOnline: context.isOnline(),
      lastError: null,
      lastSyncedAt,
      pendingCount,
    })
  } catch (error) {
    await refreshSyncStatusCounts()
    setSyncStatus('needs_attention', {
      isOnline: getIsOnline(),
      lastError: error instanceof Error ? error.message : 'Unable to sync.',
    })
  } finally {
    isSyncRunning = false
  }

  return setAndReturnCurrentStatus()
}

function setAndReturnCurrentStatus() {
  return getSyncStatusSnapshot()
}

export function startAutoSync() {
  if (isAutoSyncStarted) {
    return () => undefined
  }

  isAutoSyncStarted = true

  const unsubscribeConnectivity = subscribeToConnectivity((isOnline) => {
    setSyncStatusSnapshot({
      isOnline,
      status: isOnline ? 'synced' : 'offline',
    })

    if (isOnline) {
      void runSyncNow('reconnect')
    }
  })

  if (getIsOnline()) {
    void runSyncNow('startup')
  } else {
    setSyncStatus('offline', { isOnline: false })
  }

  return () => {
    isAutoSyncStarted = false
    unsubscribeConnectivity()
  }
}
