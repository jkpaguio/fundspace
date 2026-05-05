import { supabase } from '../../../lib/supabase'
import {
  createOfflineId,
  getCurrentUserIdForOfflineWrite,
  queueRpc,
  queueTableInsert,
  queueTableUpdate,
  readThroughCache,
  shouldQueueOfflineWrite,
} from '../../../lib/offline'
import type { Debt, DebtPayment, DebtStatus, DebtType } from '../../../types/domain'

export async function listDebts(workspaceId: string) {
  return readThroughCache<Debt>({
    fetchRemote: async () => {
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      return (data ?? []) as Debt[]
    },
    predicate: (debt) => debt.workspace_id === workspaceId,
    sort: (first, second) => second.created_at.localeCompare(first.created_at),
    tableName: 'debts',
  })
}

export async function listDebtPayments(debtId: string) {
  return readThroughCache<DebtPayment>({
    fetchRemote: async () => {
      const { data, error } = await supabase
        .from('debt_payments')
        .select('*')
        .eq('debt_id', debtId)
        .order('payment_date', { ascending: false })

      if (error) {
        throw error
      }

      return (data ?? []) as DebtPayment[]
    },
    predicate: (payment) => payment.debt_id === debtId,
    sort: (first, second) => second.payment_date.localeCompare(first.payment_date),
    tableName: 'debt_payments',
  })
}

export async function createDebt(input: {
  dueDate: string | null
  interestRate: number | null
  notes: string
  originalAmount: number
  personName: string
  type: DebtType
  workspaceId: string
}) {
  if (shouldQueueOfflineWrite()) {
    const now = new Date().toISOString()
    const userId = await getCurrentUserIdForOfflineWrite()
    const values = {
      workspace_id: input.workspaceId,
      type: input.type,
      person_name: input.personName,
      original_amount: input.originalAmount,
      remaining_amount: input.originalAmount,
      interest_rate: input.interestRate,
      due_date: input.dueDate,
      notes: input.notes || null,
      created_by: userId,
    }

    return queueTableInsert<Debt>({
      record: {
        ...values,
        created_at: now,
        id: createOfflineId(),
        status: 'active',
        updated_at: now,
      },
      remoteValues: values,
      tableName: 'debts',
      workspaceId: input.workspaceId,
    }) as Promise<Debt>
  }

  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  const { data, error } = await supabase
    .from('debts')
    .insert({
      workspace_id: input.workspaceId,
      type: input.type,
      person_name: input.personName,
      original_amount: input.originalAmount,
      remaining_amount: input.originalAmount,
      interest_rate: input.interestRate,
      due_date: input.dueDate,
      notes: input.notes || null,
      created_by: userData.user.id,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data as Debt
}

export async function createDebtPayment(input: {
  accountId: string
  amount: number
  date: string
  debtId: string
  notes: string
}) {
  if (shouldQueueOfflineWrite()) {
    await queueRpc({
      args: {
        payment_account_id: input.accountId,
        payment_amount: input.amount,
        payment_date: input.date,
        payment_notes: input.notes || null,
        target_debt_id: input.debtId,
      },
      rpcName: 'create_debt_payment',
      tableName: 'debt_payments',
    })

    return {
      amount: input.amount,
      created_at: new Date().toISOString(),
      created_by: '',
      debt_id: input.debtId,
      id: createOfflineId(),
      notes: input.notes || null,
      payment_date: input.date,
      transaction_id: '',
    } as DebtPayment
  }

  const { data, error } = await supabase.rpc('create_debt_payment', {
    payment_account_id: input.accountId,
    payment_amount: input.amount,
    payment_date: input.date,
    payment_notes: input.notes || null,
    target_debt_id: input.debtId,
  })

  if (error) {
    throw error
  }

  return data as DebtPayment
}

export async function updateDebt(input: {
  debtId: string
  dueDate: string | null
  interestRate: number | null
  notes: string
  originalAmount: number
  personName: string
  remainingAmount: number
  status: DebtStatus
  type: DebtType
}) {
  if (shouldQueueOfflineWrite()) {
    await queueTableUpdate({
      recordId: input.debtId,
      tableName: 'debts',
      updates: {
        due_date: input.dueDate,
        interest_rate: input.interestRate,
        notes: input.notes || null,
        original_amount: input.originalAmount,
        person_name: input.personName,
        remaining_amount: input.remainingAmount,
        status: input.status,
        type: input.type,
      },
    })
    return
  }

  const { error } = await supabase
    .from('debts')
    .update({
      due_date: input.dueDate,
      interest_rate: input.interestRate,
      notes: input.notes || null,
      original_amount: input.originalAmount,
      person_name: input.personName,
      remaining_amount: input.remainingAmount,
      status: input.status,
      type: input.type,
    })
    .eq('id', input.debtId)

  if (error) {
    throw error
  }
}
