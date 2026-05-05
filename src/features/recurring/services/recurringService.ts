import { supabase } from '../../../lib/supabase'
import {
  createOfflineId,
  getCurrentUserIdForOfflineWrite,
  queueTableInsert,
  queueTableUpdate,
  readThroughCache,
  shouldQueueOfflineWrite,
} from '../../../lib/offline'
import type { RecurringFrequency, RecurringTransaction, RecurringTransactionType } from '../../../types/domain'

export async function listRecurringTransactions(workspaceId: string) {
  return readThroughCache<RecurringTransaction>({
    fetchRemote: async () => {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('next_run_date', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      return (data ?? []) as RecurringTransaction[]
    },
    predicate: (item) => item.workspace_id === workspaceId,
    sort: (first, second) =>
      first.next_run_date.localeCompare(second.next_run_date)
      || first.created_at.localeCompare(second.created_at),
    tableName: 'recurring_transactions',
  })
}

export async function createRecurringTransaction(input: {
  accountId: string
  amount: number
  categoryId: string | null
  counterpartyAccountId: string | null
  endDate: string | null
  frequency: RecurringFrequency
  nextRunDate: string
  startDate: string
  type: RecurringTransactionType
  workspaceId: string
}) {
  if (shouldQueueOfflineWrite()) {
    const now = new Date().toISOString()
    const userId = await getCurrentUserIdForOfflineWrite()
    const values = {
      workspace_id: input.workspaceId,
      account_id: input.accountId,
      counterparty_account_id: input.counterpartyAccountId,
      category_id: input.categoryId,
      type: input.type,
      amount: input.amount,
      frequency: input.frequency,
      start_date: input.startDate,
      end_date: input.endDate,
      next_run_date: input.nextRunDate,
      created_by: userId,
    }

    return queueTableInsert<RecurringTransaction>({
      record: {
        ...values,
        created_at: now,
        id: createOfflineId(),
        is_active: true,
        updated_at: now,
      },
      remoteValues: values,
      tableName: 'recurring_transactions',
      workspaceId: input.workspaceId,
    }) as Promise<RecurringTransaction>
  }

  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  const { data, error } = await supabase
    .from('recurring_transactions')
    .insert({
      workspace_id: input.workspaceId,
      account_id: input.accountId,
      counterparty_account_id: input.counterpartyAccountId,
      category_id: input.categoryId,
      type: input.type,
      amount: input.amount,
      frequency: input.frequency,
      start_date: input.startDate,
      end_date: input.endDate,
      next_run_date: input.nextRunDate,
      created_by: userData.user.id,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data as RecurringTransaction
}

export async function updateRecurringTransaction(input: {
  accountId: string
  amount: number
  categoryId: string | null
  counterpartyAccountId: string | null
  endDate: string | null
  frequency: RecurringFrequency
  isActive: boolean
  nextRunDate: string
  recurringTransactionId: string
  startDate: string
  type: RecurringTransactionType
}) {
  if (shouldQueueOfflineWrite()) {
    const updates = {
      account_id: input.accountId,
      amount: input.amount,
      category_id: input.categoryId,
      counterparty_account_id: input.counterpartyAccountId,
      end_date: input.endDate,
      frequency: input.frequency,
      is_active: input.isActive,
      next_run_date: input.nextRunDate,
      start_date: input.startDate,
      type: input.type,
    }

    await queueTableUpdate({
      recordId: input.recurringTransactionId,
      tableName: 'recurring_transactions',
      updates,
    })

    return {
      ...updates,
      created_at: new Date().toISOString(),
      created_by: '',
      id: input.recurringTransactionId,
      updated_at: new Date().toISOString(),
      workspace_id: '',
    } as RecurringTransaction
  }

  const { data, error } = await supabase
    .from('recurring_transactions')
    .update({
      account_id: input.accountId,
      amount: input.amount,
      category_id: input.categoryId,
      counterparty_account_id: input.counterpartyAccountId,
      end_date: input.endDate,
      frequency: input.frequency,
      is_active: input.isActive,
      next_run_date: input.nextRunDate,
      start_date: input.startDate,
      type: input.type,
    })
    .eq('id', input.recurringTransactionId)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data as RecurringTransaction
}
