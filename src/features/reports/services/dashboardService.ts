import { buildBudgetUsage, listBudgets } from '../../budgets/services/budgetService'
import { listAccounts } from '../../accounts/services/accountService'
import { listActivityLogs } from '../../activity/services/activityService'
import { listCategories } from '../../categories/services/categoryService'
import { listDebts } from '../../debts/services/debtService'
import {
  listBusinessExpenses,
  listBusinesses,
  listProducts,
  listSales,
} from '../../business/services/businessService'
import { listSavingsBuckets } from '../../savings/services/savingsService'
import { listMonthlyTransactions, listTransactions } from '../../transactions/services/transactionService'
import type {
  Account,
  ActivityLog,
  BudgetUsage,
  Business,
  BusinessExpense,
  Category,
  Debt,
  Product,
  Sale,
  SavingsBucket,
  Transaction,
  WorkspaceType,
} from '../../../types/domain'

export type DashboardBusinessChild = {
  business: Business
  expenses: BusinessExpense[]
  products: Product[]
  sales: Sale[]
}

export type DashboardData = {
  accounts: Account[]
  activityLogs: ActivityLog[]
  budgetUsage: BudgetUsage[]
  businessChildren: DashboardBusinessChild[]
  categories: Category[]
  debts: Debt[]
  monthlyTransactions: Transaction[]
  recentTransactions: Transaction[]
  savingsBuckets: SavingsBucket[]
}

export async function loadDashboardData(workspaceId: string, workspaceType: WorkspaceType): Promise<DashboardData> {
  const currentDate = new Date()
  const isBusinessWorkspace = workspaceType === 'business' || workspaceType === 'side_hustle'

  const [accounts, activityLogs, categories, monthlyTransactions, recentTransactions, budgets, savingsBuckets, debts, businesses] =
    await Promise.all([
      listAccounts(workspaceId),
      listActivityLogs(workspaceId),
      listCategories(workspaceId),
      listMonthlyTransactions(workspaceId),
      listTransactions(workspaceId),
      listBudgets(workspaceId, currentDate.getMonth() + 1, currentDate.getFullYear()),
      isBusinessWorkspace ? Promise.resolve([]) : listSavingsBuckets(workspaceId),
      isBusinessWorkspace ? Promise.resolve([]) : listDebts(workspaceId),
      isBusinessWorkspace ? listBusinesses(workspaceId) : Promise.resolve([]),
    ])

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
    activityLogs: activityLogs.slice(0, 5),
    budgetUsage: buildBudgetUsage(budgets, monthlyTransactions),
    businessChildren,
    categories,
    debts,
    monthlyTransactions,
    recentTransactions: recentTransactions.slice(0, 6),
    savingsBuckets,
  }
}
