import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, RefreshCw, RotateCcw, WifiOff } from 'lucide-react'
import { EmptyState } from '../../../components/common/EmptyState'
import { PageHeader } from '../../../components/common/PageHeader'
import { Button } from '../../../components/ui'
import {
  listOpenSyncConflicts,
  listSyncOperations,
  resolveSyncConflict,
  runSyncNow,
  type SyncConflict,
  type SyncOutboxItem,
} from '../../../lib/offline'
import { useSyncStatus } from '../../../hooks/useSyncStatus'

function formatSyncTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : 'Not yet'
}

export function SyncCenterPage() {
  const syncStatus = useSyncStatus()
  const [operations, setOperations] = useState<SyncOutboxItem[]>([])
  const [conflicts, setConflicts] = useState<SyncConflict[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const loadSyncItems = useCallback(async () => {
    const [nextOperations, nextConflicts] = await Promise.all([
      listSyncOperations(),
      listOpenSyncConflicts(),
    ])

    setOperations(nextOperations)
    setConflicts(nextConflicts)
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSyncItems()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadSyncItems, syncStatus.pendingCount, syncStatus.conflictCount])

  const handleRetry = async () => {
    setIsLoading(true)
    setMessage('')

    try {
      await runSyncNow('sync-center')
      await loadSyncItems()
      setMessage('Sync checked.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResolveConflict = async (conflictId: string) => {
    await resolveSyncConflict(conflictId)
    await loadSyncItems()
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Offline sync"
        heading="Sync Center"
        lead="Review queued offline changes, retry failed syncs, and clear conflicts after server data is kept."
      />

      <section className={`sync-status-panel sync-status-panel-${syncStatus.status}`}>
        {syncStatus.status === 'offline' ? (
          <WifiOff aria-hidden="true" size={22} />
        ) : syncStatus.status === 'needs_attention' ? (
          <AlertTriangle aria-hidden="true" size={22} />
        ) : syncStatus.status === 'syncing' ? (
          <RefreshCw aria-hidden="true" size={22} />
        ) : (
          <CheckCircle2 aria-hidden="true" size={22} />
        )}
        <div>
          <p className="eyebrow">{syncStatus.isOnline ? 'Online' : 'Offline'}</p>
          <h2>{syncStatus.status.replace('_', ' ')}</h2>
          <p>
            {syncStatus.pendingCount} pending / {syncStatus.conflictCount} conflicts / last synced{' '}
            {formatSyncTime(syncStatus.lastSyncedAt)}
          </p>
          {syncStatus.lastError && <p className="form-error">{syncStatus.lastError}</p>}
          {message && <p className="form-success">{message}</p>}
        </div>
        <Button disabled={isLoading || !syncStatus.isOnline} onClick={() => void handleRetry()} type="button">
          <RotateCcw aria-hidden="true" size={16} />
          {isLoading ? 'Checking...' : 'Retry sync'}
        </Button>
      </section>

      <section className="content-grid">
        <section className="list-panel">
          <div className="section-heading">
            <h2>Queued changes</h2>
            <span>{operations.length} items</span>
          </div>

          {operations.length === 0 ? (
            <EmptyState
              description="Offline changes will appear here until they sync to Supabase."
              title="No queued changes"
            />
          ) : (
            <div className="record-list">
              {operations.map((operation) => (
                <div className="record-row record-row-stack" key={operation.id}>
                  <span>
                    <strong>{operation.table_name.replace('_', ' ')}</strong>
                    <small>
                      {operation.operation} / {operation.status} / {formatSyncTime(operation.created_at)}
                    </small>
                    {operation.error_message && <small className="amount-out">{operation.error_message}</small>}
                  </span>
                  <span className={`sync-pill sync-pill-${operation.status}`}>{operation.status}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="list-panel">
          <div className="section-heading">
            <h2>Conflicts</h2>
            <span>{conflicts.length} open</span>
          </div>
          <p className="section-description">
            Server data stays as the source of truth. Clear a conflict after reviewing why the local
            offline change was not applied.
          </p>

          {conflicts.length === 0 ? (
            <EmptyState
              description="Server-wins conflicts will appear here when online data changed before your offline edit synced."
              title="No conflicts"
            />
          ) : (
            <div className="record-list">
              {conflicts.map((conflict) => (
                <div className="record-row record-row-stack" key={conflict.id}>
                  <span>
                    <strong>{conflict.table_name.replace('_', ' ')}</strong>
                    <small>{conflict.reason}</small>
                    <small>{formatSyncTime(conflict.created_at)}</small>
                  </span>
                  <Button onClick={() => void handleResolveConflict(conflict.id)} type="button" variant="secondary">
                    Clear
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </div>
  )
}
