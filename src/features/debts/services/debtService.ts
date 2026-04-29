import { supabase } from '../../../lib/supabase'
import type { Debt, DebtPayment, DebtStatus, DebtType } from '../../../types/domain'

export async function listDebts(workspaceId: string) {
  const { data, error } = await supabase
    .from('debts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []) as Debt[]
}

export async function listDebtPayments(debtId: string) {
  const { data, error } = await supabase
    .from('debt_payments')
    .select('*')
    .eq('debt_id', debtId)
    .order('payment_date', { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []) as DebtPayment[]
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
