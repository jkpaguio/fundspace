import { buildBudgetUsage, listBudgets } from '../../budgets/services/budgetService'
import { listAccounts } from '../../accounts/services/accountService'
import { listCategories } from '../../categories/services/categoryService'
import { listDebts } from '../../debts/services/debtService'
import {
  listBusinessExpenses,
  listBusinesses,
  listProducts,
  listSales,
} from '../../business/services/businessService'
import { listSavingsBuckets } from '../../savings/services/savingsService'
import { listTransactions } from '../../transactions/services/transactionService'

export async function loadAdvancedReportData(
  workspaceId: string,
  month: number,
  year: number,
) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().slice(0, 10)

  const [accounts, categories, savingsBuckets, debts, businesses, budgets, transactions] =
    await Promise.all([
      listAccounts(workspaceId),
      listCategories(workspaceId),
      listSavingsBuckets(workspaceId),
      listDebts(workspaceId),
      listBusinesses(workspaceId),
      listBudgets(workspaceId, month, year),
      listTransactions(workspaceId),
    ])

  const filteredTransactions = transactions.filter(
    (transaction) =>
      transaction.transaction_date >= startDate && transaction.transaction_date <= endDate,
  )

  const businessChildren = await Promise.all(
    businesses.map(async (business) => {
      const [products, sales, expenses] = await Promise.all([
        listProducts(business.id),
        listSales(business.id),
        listBusinessExpenses(business.id),
      ])

      return { business, expenses, products, sales }
    }),
  )

  return {
    accounts,
    budgetUsage: buildBudgetUsage(budgets, filteredTransactions),
    businessChildren,
    categories,
    debts,
    savingsBuckets,
    transactions: filteredTransactions,
  }
}
