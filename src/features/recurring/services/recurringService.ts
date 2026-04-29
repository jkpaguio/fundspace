import { supabase } from '../../../lib/supabase'
import type { RecurringFrequency, RecurringTransaction, RecurringTransactionType } from '../../../types/domain'

export async function listRecurringTransactions(workspaceId: string) {
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
