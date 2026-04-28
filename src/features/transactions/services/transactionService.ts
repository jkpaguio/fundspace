import { supabase } from '../../../lib/supabase'
import type { Transaction, TransactionType } from '../../../types/domain'

export type TransactionFilter = {
  accountId?: string
  categoryId?: string
  search?: string
  type?: TransactionType | 'all'
}

export async function listTransactions(
  workspaceId: string,
  filter: TransactionFilter = {},
) {
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (filter.type && filter.type !== 'all') {
    query = query.eq('type', filter.type)
  }

  if (filter.accountId) {
    query = query.eq('account_id', filter.accountId)
  }

  if (filter.categoryId) {
    query = query.eq('category_id', filter.categoryId)
  }

  if (filter.search) {
    query = query.ilike('notes', `%${filter.search}%`)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data ?? []) as Transaction[]
}

export async function listMonthlyTransactions(workspaceId: string, date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('workspace_id', workspaceId)
    .gte('transaction_date', start.toISOString().slice(0, 10))
    .lte('transaction_date', end.toISOString().slice(0, 10))
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []) as Transaction[]
}

export async function createMoneyTransaction(input: {
  accountId: string
  amount: number
  categoryId: string | null
  date: string
  notes: string
  type: 'income' | 'expense'
  workspaceId: string
}) {
  const { error } = await supabase.rpc('create_money_transaction', {
    target_account_id: input.accountId,
    target_category_id: input.categoryId,
    target_workspace_id: input.workspaceId,
    transaction_amount: input.amount,
    transaction_date: input.date,
    transaction_notes: input.notes || null,
    transaction_type: input.type,
  })

  if (error) {
    throw error
  }
}

export async function createTransferTransaction(input: {
  amount: number
  date: string
  destinationAccountId: string
  notes: string
  sourceAccountId: string
  workspaceId: string
}) {
  const { error } = await supabase.rpc('create_transfer_transaction', {
    destination_account_id: input.destinationAccountId,
    source_account_id: input.sourceAccountId,
    target_workspace_id: input.workspaceId,
    transfer_amount: input.amount,
    transfer_date: input.date,
    transfer_notes: input.notes || null,
  })

  if (error) {
    throw error
  }
}
