import type { OfflineSyncStatus } from '../../lib/offline'

type SyncBadgeProps = {
  status?: OfflineSyncStatus | string | null
}

const statusLabels: Partial<Record<OfflineSyncStatus | string, string>> = {
  conflict: 'Needs review',
  failed: 'Sync failed',
  pending: 'Pending sync',
  synced: 'Synced',
  syncing: 'Syncing',
}

export function SyncBadge({ status }: SyncBadgeProps) {
  if (!status || status === 'synced') {
    return null
  }

  return (
    <span className={`sync-pill sync-pill-${status}`}>
      {statusLabels[status] ?? 'Pending sync'}
    </span>
  )
}
