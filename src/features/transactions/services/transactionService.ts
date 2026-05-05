import { supabase } from '../../../lib/supabase'
import {
  queueRpc,
  readThroughCache,
  shouldQueueOfflineWrite,
} from '../../../lib/offline'
import type { Transaction, TransactionType } from '../../../types/domain'

export type TransactionFilter = {
  accountId?: string
  categoryId?: string
  search?: string
  type?: TransactionType | 'all'
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export async function listTransactions(
  workspaceId: string,
  filter: TransactionFilter = {},
) {
  const predicate = (transaction: Transaction) => {
    if (transaction.workspace_id !== workspaceId) {
      return false
    }

    if (filter.type && filter.type !== 'all' && transaction.type !== filter.type) {
      return false
    }

    if (filter.accountId && transaction.account_id !== filter.accountId) {
      return false
    }

    if (filter.categoryId && transaction.category_id !== filter.categoryId) {
      return false
    }

    if (filter.search && !transaction.notes?.toLowerCase().includes(filter.search.toLowerCase())) {
      return false
    }

    return true
  }

  return readThroughCache<Transaction>({
    fetchRemote: async () => {
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
    },
    predicate,
    sort: (first, second) =>
      second.transaction_date.localeCompare(first.transaction_date)
      || second.created_at.localeCompare(first.created_at),
    stalePredicate: (transaction) => transaction.workspace_id === workspaceId,
    tableName: 'transactions',
  })
}

export async function listMonthlyTransactions(workspaceId: string, date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)

  return listTransactionsByDateRange(workspaceId, start, end)
}

export async function listTransactionsByDateRange(
  workspaceId: string,
  startDate: Date,
  endDate: Date,
) {
  const startDateKey = toDateKey(startDate)
  const endDateKey = toDateKey(endDate)

  return readThroughCache<Transaction>({
    fetchRemote: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .gte('transaction_date', startDateKey)
        .lte('transaction_date', endDateKey)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      return (data ?? []) as Transaction[]
    },
    predicate: (transaction) =>
      transaction.workspace_id === workspaceId
      && transaction.transaction_date >= startDateKey
      && transaction.transaction_date <= endDateKey,
    sort: (first, second) =>
      second.transaction_date.localeCompare(first.transaction_date)
      || second.created_at.localeCompare(first.created_at),
    stalePredicate: (transaction) =>
      transaction.workspace_id === workspaceId
      && transaction.transaction_date >= startDateKey
      && transaction.transaction_date <= endDateKey,
    tableName: 'transactions',
  })
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
  if (shouldQueueOfflineWrite()) {
    await queueRpc({
      args: {
        target_account_id: input.accountId,
        target_category_id: input.categoryId,
        target_workspace_id: input.workspaceId,
        transaction_amount: input.amount,
        transaction_date: input.date,
        transaction_notes: input.notes || null,
        transaction_type: input.type,
      },
      rpcName: 'create_money_transaction',
      tableName: 'transactions',
      workspaceId: input.workspaceId,
    })
    return
  }

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

export async function createCorrectionTransaction(input: {
  accountId: string
  amount: number
  categoryId: string | null
  date: string
  direction: 'in' | 'out'
  notes: string
  workspaceId: string
}) {
  if (shouldQueueOfflineWrite()) {
    await queueRpc({
      args: {
        target_account_id: input.accountId,
        target_category_id: input.categoryId,
        target_workspace_id: input.workspaceId,
        transaction_amount: input.amount,
        transaction_date: input.date,
        transaction_notes: input.notes || null,
        transaction_type: input.direction === 'in' ? 'adjustment' : 'expense',
      },
      rpcName: 'create_money_transaction',
      tableName: 'transactions',
      workspaceId: input.workspaceId,
    })
    return
  }

  const { error } = await supabase.rpc('create_money_transaction', {
    target_account_id: input.accountId,
    target_category_id: input.categoryId,
    target_workspace_id: input.workspaceId,
    transaction_amount: input.amount,
    transaction_date: input.date,
    transaction_notes: input.notes || null,
    transaction_type: input.direction === 'in' ? 'adjustment' : 'expense',
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
  if (shouldQueueOfflineWrite()) {
    await queueRpc({
      args: {
        destination_account_id: input.destinationAccountId,
        source_account_id: input.sourceAccountId,
        target_workspace_id: input.workspaceId,
        transfer_amount: input.amount,
        transfer_date: input.date,
        transfer_notes: input.notes || null,
      },
      rpcName: 'create_transfer_transaction',
      tableName: 'transactions',
      workspaceId: input.workspaceId,
    })
    return
  }

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
