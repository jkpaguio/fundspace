import { calculateBudgetUsage } from '../../../lib/calculations'
import {
  createOfflineId,
  getCurrentUserIdForOfflineWrite,
  queueTableInsert,
  queueTableUpdate,
  readThroughCache,
  shouldQueueOfflineWrite,
} from '../../../lib/offline'
import { supabase } from '../../../lib/supabase'
import type { Budget, BudgetStatus, BudgetUsage, Transaction } from '../../../types/domain'

export async function listBudgets(workspaceId: string, month: number, year: number) {
  return readThroughCache<Budget>({
    fetchRemote: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('month', month)
        .eq('year', year)
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      return (data ?? []) as Budget[]
    },
    predicate: (budget) =>
      budget.workspace_id === workspaceId && budget.month === month && budget.year === year,
    sort: (first, second) => first.created_at.localeCompare(second.created_at),
    tableName: 'budgets',
  })
}

export async function createBudget(input: {
  categoryId: string
  limitAmount: number
  month: number
  warningPercentage: number
  workspaceId: string
  year: number
}) {
  if (shouldQueueOfflineWrite()) {
    const now = new Date().toISOString()
    const userId = await getCurrentUserIdForOfflineWrite()
    const values = {
      workspace_id: input.workspaceId,
      category_id: input.categoryId,
      month: input.month,
      year: input.year,
      limit_amount: input.limitAmount,
      warning_percentage: input.warningPercentage,
      created_by: userId,
    }

    await queueTableInsert<Budget>({
      record: {
        ...values,
        created_at: now,
        id: createOfflineId(),
        updated_at: now,
      },
      remoteValues: values,
      tableName: 'budgets',
      workspaceId: input.workspaceId,
    })
    return
  }

  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  const { error } = await supabase.from('budgets').insert({
    workspace_id: input.workspaceId,
    category_id: input.categoryId,
    month: input.month,
    year: input.year,
    limit_amount: input.limitAmount,
    warning_percentage: input.warningPercentage,
    created_by: userData.user.id,
  })

  if (error) {
    throw error
  }
}

export async function updateBudget(input: {
  budgetId: string
  categoryId: string
  limitAmount: number
  warningPercentage: number
}) {
  if (shouldQueueOfflineWrite()) {
    await queueTableUpdate({
      recordId: input.budgetId,
      tableName: 'budgets',
      updates: {
        category_id: input.categoryId,
        limit_amount: input.limitAmount,
        warning_percentage: input.warningPercentage,
      },
    })
    return
  }

  const { error } = await supabase
    .from('budgets')
    .update({
      category_id: input.categoryId,
      limit_amount: input.limitAmount,
      warning_percentage: input.warningPercentage,
    })
    .eq('id', input.budgetId)

  if (error) {
    throw error
  }
}

export function buildBudgetUsage(
  budgets: Budget[],
  monthlyTransactions: Transaction[],
): BudgetUsage[] {
  return budgets.map((budget) => {
    const spent = monthlyTransactions
      .filter(
        (transaction) =>
          transaction.direction === 'out' && transaction.category_id === budget.category_id,
      )
      .reduce((total, transaction) => total + transaction.amount, 0)

    const usagePercentage = calculateBudgetUsage(spent, budget.limit_amount)
    const status = resolveBudgetStatus(usagePercentage, budget.warning_percentage)

    return {
      budget,
      remaining: budget.limit_amount - spent,
      spent,
      status,
      usagePercentage,
    }
  })
}

function resolveBudgetStatus(usagePercentage: number, warningPercentage: number): BudgetStatus {
  if (usagePercentage >= 100) {
    return 'over'
  }

  if (usagePercentage >= warningPercentage) {
    return 'warning'
  }

  return 'safe'
}
