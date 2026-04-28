import { listAccounts } from '../../accounts/services/accountService'
import { listCategories } from '../../categories/services/categoryService'
import { listMonthlyTransactions, listTransactions } from '../../transactions/services/transactionService'

export async function loadDashboardData(workspaceId: string) {
  const [accounts, categories, monthlyTransactions, recentTransactions] =
    await Promise.all([
      listAccounts(workspaceId),
      listCategories(workspaceId),
      listMonthlyTransactions(workspaceId),
      listTransactions(workspaceId),
    ])

  return {
    accounts,
    categories,
    monthlyTransactions,
    recentTransactions: recentTransactions.slice(0, 6),
  }
}
