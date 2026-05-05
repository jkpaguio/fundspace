import { supabase } from '../../../lib/supabase'
import { getMemberDisplayName } from '../../../lib/memberDisplay'
import { queueRpc, readThroughCache, shouldQueueOfflineWrite } from '../../../lib/offline'
import type { ActivityLog, Transaction, WorkspaceProfile } from '../../../types/domain'

export async function listActivityLogs(workspaceId: string) {
  return readThroughCache<ActivityLog>({
    fetchRemote: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        throw error
      }

      return (data ?? []) as ActivityLog[]
    },
    predicate: (log) => log.workspace_id === workspaceId,
    sort: (first, second) => second.created_at.localeCompare(first.created_at),
    tableName: 'activity_logs',
  })
}

export async function createActivityLog(input: {
  action: string
  description: string
  entityId: string | null
  entityType: string
  workspaceId: string
}) {
  if (shouldQueueOfflineWrite()) {
    await queueRpc({
      args: {
        target_action: input.action,
        target_description: input.description,
        target_entity_id: input.entityId,
        target_entity_type: input.entityType,
        target_workspace_id: input.workspaceId,
      },
      rpcName: 'log_activity',
      tableName: 'activity_logs',
      workspaceId: input.workspaceId,
    })
    return
  }

  const { error } = await supabase.rpc('log_activity', {
    target_action: input.action,
    target_description: input.description,
    target_entity_id: input.entityId,
    target_entity_type: input.entityType,
    target_workspace_id: input.workspaceId,
  })

  if (error) {
    throw error
  }
}

export function buildMemberSpendingReport(
  transactions: Transaction[],
  profiles: WorkspaceProfile[],
) {
  const totals = new Map<string, number>()

  transactions
    .filter((transaction) => transaction.direction === 'out')
    .forEach((transaction) => {
      totals.set(transaction.created_by, (totals.get(transaction.created_by) ?? 0) + transaction.amount)
    })

  return Array.from(totals.entries())
    .map(([userId, total]) => ({
      name: getMemberDisplayName(profiles, userId),
      total,
      userId,
    }))
    .sort((first, second) => second.total - first.total)
}
