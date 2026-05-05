import type { OfflineRecordMetadata, OfflineSyncStatus } from './types'

export function createOfflineMetadata(input: {
  lastSyncedAt?: string | null
  localId?: string
  serverUpdatedAt?: string | null
  status?: OfflineSyncStatus
  syncError?: string | null
} = {}): OfflineRecordMetadata {
  return {
    last_synced_at: input.lastSyncedAt ?? null,
    local_id: input.localId,
    server_updated_at: input.serverUpdatedAt ?? null,
    sync_error: input.syncError ?? null,
    sync_status: input.status ?? 'synced',
  }
}

export function markRecordSynced<TRecord extends { updated_at?: string }>(
  record: TRecord,
  syncedAt = new Date().toISOString(),
) {
  return {
    ...record,
    ...createOfflineMetadata({
      lastSyncedAt: syncedAt,
      serverUpdatedAt: record.updated_at ?? syncedAt,
      status: 'synced',
    }),
  }
}

export function markRecordPending<TRecord>(
  record: TRecord,
  localId?: string,
) {
  return {
    ...record,
    ...createOfflineMetadata({
      localId,
      status: 'pending',
    }),
  }
}
