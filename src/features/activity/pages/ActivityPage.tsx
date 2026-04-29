import { useCallback, useEffect, useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { EmptyState } from '../../../components/common/EmptyState'
import { PageHeader } from '../../../components/common/PageHeader'
import { Card, CardContent, CardHeader } from '../../../components/ui'
import { formatCurrency } from '../../../lib/formatCurrency'
import { useWorkspaceOutlet } from '../../../hooks/useWorkspaceOutlet'
import { listMonthlyTransactions } from '../../transactions/services/transactionService'
import { listWorkspaceProfiles } from '../../workspaces/services/workspaceService'
import { buildMemberSpendingReport, listActivityLogs } from '../services/activityService'
import type { ActivityLog, Transaction, WorkspaceProfile } from '../../../types/domain'

export function ActivityPage() {
  const { selectedWorkspace } = useWorkspaceOutlet()
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [profiles, setProfiles] = useState<WorkspaceProfile[]>([])
  const [monthlyTransactions, setMonthlyTransactions] = useState<Transaction[]>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const loadPageData = useCallback(async () => {
    if (!selectedWorkspace) {
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const [nextLogs, nextProfiles, nextMonthlyTransactions] = await Promise.all([
        listActivityLogs(selectedWorkspace.id),
        listWorkspaceProfiles(selectedWorkspace.id),
        listMonthlyTransactions(selectedWorkspace.id),
      ])

      setActivityLogs(nextLogs)
      setProfiles(nextProfiles)
      setMonthlyTransactions(nextMonthlyTransactions)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load activity.')
    } finally {
      setIsLoading(false)
    }
  }, [selectedWorkspace])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPageData()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadPageData])

  const memberSpending = useMemo(
    () => buildMemberSpendingReport(monthlyTransactions, profiles),
    [monthlyTransactions, profiles],
  )

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Shared space"
        heading="Activity and member spending"
        lead="Review the latest space actions and see who recorded the most spending this month."
      />

      {error && <p className="form-error">{error}</p>}

      {!selectedWorkspace ? (
        <EmptyState
          description="Choose a space first so FundSpace can load its audit trail and member spending snapshot."
          title="Activity is shown per space"
        />
      ) : (
        <section className="content-grid">
          <section className="list-panel">
            <div className="section-heading">
              <h2>Recent activity</h2>
              <span>{isLoading ? 'Loading' : `${activityLogs.length} entries`}</span>
            </div>

            {activityLogs.length === 0 && !isLoading ? (
              <EmptyState
                description="New records, updates, and workspace actions will start appearing here as the team uses this space."
                title="No activity has been recorded yet"
              />
            ) : (
              <div className="record-list">
                {activityLogs.map((log) => {
                  const actor = profiles.find((profile) => profile.id === log.user_id)

                  return (
                    <div className="record-row record-row-stack" key={log.id}>
                      <span>
                        <strong>{log.description}</strong>
                        <small>
                          {actor?.full_name || log.user_id} / {log.entity_type.replace('_', ' ')}
                        </small>
                      </span>
                      <span className="record-row-meta">
                        <strong>{log.action.replaceAll('_', ' ')}</strong>
                        <small>{new Date(log.created_at).toLocaleString()}</small>
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <Card>
            <CardHeader>
              <Users aria-hidden="true" size={20} />
              <h2>Member spending report</h2>
            </CardHeader>
            <CardContent>
              {memberSpending.length === 0 ? (
                <EmptyState
                  description="Once members record expenses this month, the spending breakdown will show up here."
                  title="No member spending to compare"
                />
              ) : (
                <div className="record-list">
                  {memberSpending.map((item) => (
                    <div className="record-row" key={item.userId}>
                      <span>
                        <strong>{item.name}</strong>
                        <small>Encoded by member</small>
                      </span>
                      <span>{formatCurrency(item.total, selectedWorkspace.currency)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  )
}
