import { offlineDb } from './database'
import { createOfflineQueueId } from './ids'
import type {
  LocalMirrorTableName,
  SyncConflict,
  SyncMeta,
  SyncOperationType,
  SyncOutboxItem,
  SyncOutboxStatus,
} from './types'

function getTimestamp() {
  return new Date().toISOString()
}

export async function enqueueSyncOperation(input: {
  baseServerUpdatedAt?: string | null
  localRecordId?: string | null
  operation: SyncOperationType
  payload: unknown
  recordId?: string | null
  tableName: LocalMirrorTableName
  workspaceId?: string | null
}) {
  const item: SyncOutboxItem = {
    id: createOfflineQueueId('outbox'),
    base_server_updated_at: input.baseServerUpdatedAt ?? null,
    created_at: getTimestamp(),
    error_message: null,
    last_attempt_at: null,
    local_record_id: input.localRecordId ?? null,
    operation: input.operation,
    payload: input.payload,
    record_id: input.recordId ?? null,
    retry_count: 0,
    status: 'pending',
    table_name: input.tableName,
    workspace_id: input.workspaceId ?? null,
  }

  await offlineDb.sync_outbox.add(item)

  return item
}

export async function listPendingSyncOperations() {
  return offlineDb.sync_outbox
    .where('status')
    .anyOf(['pending', 'failed'])
    .sortBy('created_at')
}

export async function listSyncOperations() {
  return offlineDb.sync_outbox
    .orderBy('created_at')
    .toArray()
}

export async function countPendingSyncOperations() {
  return offlineDb.sync_outbox
    .where('status')
    .anyOf(['pending', 'failed', 'syncing'])
    .count()
}

export async function countFailedSyncOperations() {
  return offlineDb.sync_outbox
    .where('status')
    .anyOf(['failed', 'conflict'])
    .count()
}

export async function updateSyncOperationStatus(
  outboxId: string,
  status: SyncOutboxStatus,
  errorMessage: string | null = null,
) {
  const current = await offlineDb.sync_outbox.get(outboxId)

  if (!current) {
    return
  }

  await offlineDb.sync_outbox.update(outboxId, {
    error_message: errorMessage,
    last_attempt_at: getTimestamp(),
    retry_count: status === 'failed' ? current.retry_count + 1 : current.retry_count,
    status,
  })
}

export async function removeSyncOperation(outboxId: string) {
  await offlineDb.sync_outbox.delete(outboxId)
}

export async function createSyncConflict(input: {
  localPayload: unknown
  outboxId?: string | null
  reason: string
  recordId?: string | null
  serverPayload: unknown
  tableName: LocalMirrorTableName
  workspaceId?: string | null
}) {
  const conflict: SyncConflict = {
    id: createOfflineQueueId('conflict'),
    created_at: getTimestamp(),
    local_payload: input.localPayload,
    outbox_id: input.outboxId ?? null,
    reason: input.reason,
    record_id: input.recordId ?? null,
    resolved_at: null,
    server_payload: input.serverPayload,
    table_name: input.tableName,
    workspace_id: input.workspaceId ?? null,
  }

  await offlineDb.sync_conflicts.add(conflict)

  if (input.outboxId) {
    await updateSyncOperationStatus(input.outboxId, 'conflict', input.reason)
  }

  return conflict
}

export async function listOpenSyncConflicts() {
  const conflicts = await offlineDb.sync_conflicts
    .orderBy('created_at')
    .toArray()

  return conflicts.filter((conflict) => conflict.resolved_at === null)
}

export async function countOpenSyncConflicts() {
  const conflicts = await listOpenSyncConflicts()

  return conflicts.length
}

export async function resolveSyncConflict(conflictId: string) {
  await offlineDb.sync_conflicts.update(conflictId, {
    resolved_at: getTimestamp(),
  })
}

export async function getSyncMeta<TValue = unknown>(key: string) {
  const entry = await offlineDb.sync_meta.get(key)

  return entry?.value as TValue | undefined
}

export async function setSyncMeta(key: string, value: unknown) {
  const entry: SyncMeta = {
    key,
    updated_at: getTimestamp(),
    value,
  }

  await offlineDb.sync_meta.put(entry)

  return entry
}
