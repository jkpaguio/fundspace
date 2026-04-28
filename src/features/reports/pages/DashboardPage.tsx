import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, PiggyBank, WalletCards } from 'lucide-react'
import { Card, CardContent, CardHeader } from '../../../components/ui'
import {
  calculateMonthlyExpenses,
  calculateMonthlyIncome,
  calculateNetSavings,
  calculateTotalBalance,
} from '../../../lib/calculations'
import { formatCurrency } from '../../../lib/formatCurrency'
import { useWorkspaceOutlet } from '../../../hooks/useWorkspaceOutlet'
import type { Account, Category, Transaction } from '../../../types/domain'
import { loadDashboardData } from '../services/dashboardService'

type DashboardState = {
  accounts: Account[]
  categories: Category[]
  monthlyTransactions: Transaction[]
  recentTransactions: Transaction[]
}

const emptyDashboard: DashboardState = {
  accounts: [],
  categories: [],
  monthlyTransactions: [],
  recentTransactions: [],
}

export function DashboardPage() {
  const { selectedWorkspace } = useWorkspaceOutlet()
  const [dashboard, setDashboard] = useState<DashboardState>(emptyDashboard)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const loadDashboard = useCallback(async () => {
    if (!selectedWorkspace) {
      return
    }

    setIsLoading(true)
    setError('')

    try {
      setDashboard(await loadDashboardData(selectedWorkspace.id))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard.')
    } finally {
      setIsLoading(false)
    }
  }, [selectedWorkspace])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDashboard()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadDashboard])

  const summary = useMemo(() => {
    const income = calculateMonthlyIncome(dashboard.monthlyTransactions)
    const expenses = calculateMonthlyExpenses(dashboard.monthlyTransactions)

    return {
      expenses,
      income,
      netSavings: calculateNetSavings(income, expenses),
      totalBalance: calculateTotalBalance(dashboard.accounts),
    }
  }, [dashboard.accounts, dashboard.monthlyTransactions])

  const topSpendingCategories = useMemo(() => {
    const categoryTotals = new Map<string, number>()

    dashboard.monthlyTransactions
      .filter((transaction) => transaction.direction === 'out' && transaction.category_id)
      .forEach((transaction) => {
        categoryTotals.set(
          transaction.category_id!,
          (categoryTotals.get(transaction.category_id!) ?? 0) + transaction.amount,
        )
      })

    return Array.from(categoryTotals.entries())
      .map(([categoryId, total]) => ({
        category: dashboard.categories.find((item) => item.id === categoryId)?.name ?? 'Uncategorized',
        total,
      }))
      .sort((first, second) => second.total - first.total)
      .slice(0, 5)
  }, [dashboard.categories, dashboard.monthlyTransactions])

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Monthly financial status</h1>
          <p className="lead">
            See balances, this month&apos;s money flow, recent transactions, and early budget signals.
          </p>
        </div>
      </header>

      {error && <p className="form-error">{error}</p>}

      {!selectedWorkspace ? (
        <p className="empty-state">Create a workspace to start your dashboard.</p>
      ) : (
        <>
          <section className="metric-grid">
            <Card>
              <CardHeader>
                <WalletCards aria-hidden="true" size={20} />
                <h2>Total balance</h2>
              </CardHeader>
              <CardContent>
                <p className="metric-value">
                  {formatCurrency(summary.totalBalance, selectedWorkspace.currency)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <ArrowUpCircle aria-hidden="true" size={20} />
                <h2>Income this month</h2>
              </CardHeader>
              <CardContent>
                <p className="metric-value amount-in">
                  {formatCurrency(summary.income, selectedWorkspace.currency)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <ArrowDownCircle aria-hidden="true" size={20} />
                <h2>Expenses this month</h2>
              </CardHeader>
              <CardContent>
                <p className="metric-value amount-out">
                  {formatCurrency(summary.expenses, selectedWorkspace.currency)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <PiggyBank aria-hidden="true" size={20} />
                <h2>Net savings</h2>
              </CardHeader>
              <CardContent>
                <p className="metric-value">
                  {formatCurrency(summary.netSavings, selectedWorkspace.currency)}
                </p>
              </CardContent>
            </Card>
          </section>

          <section className="content-grid">
            <section className="list-panel">
              <div className="section-heading">
                <h2>Recent transactions</h2>
                <span>{isLoading ? 'Loading' : `${dashboard.recentTransactions.length} latest`}</span>
              </div>

              {dashboard.recentTransactions.length === 0 && !isLoading ? (
                <p className="empty-state">No transactions yet. Record income or an expense to start.</p>
              ) : (
                <div className="record-list">
                  {dashboard.recentTransactions.map((transaction) => (
                    <div className="record-row" key={transaction.id}>
                      <span>
                        <strong>{transaction.notes || transaction.type.replace('_', ' ')}</strong>
                        <small>{transaction.transaction_date}</small>
                      </span>
                      <span className={transaction.direction === 'in' ? 'amount-in' : 'amount-out'}>
                        {transaction.direction === 'in' ? '+' : '-'}
                        {formatCurrency(transaction.amount, selectedWorkspace.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="list-panel">
              <div className="section-heading">
                <h2>Top spending categories</h2>
                <span>This month</span>
              </div>

              {topSpendingCategories.length === 0 ? (
                <p className="empty-state">No categorized expenses yet.</p>
              ) : (
                <div className="record-list">
                  {topSpendingCategories.map((item) => (
                    <div className="record-row" key={item.category}>
                      <span>
                        <strong>{item.category}</strong>
                        <small>Expense category</small>
                      </span>
                      <span>{formatCurrency(item.total, selectedWorkspace.currency)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </section>

          <section className="budget-warning">
            <AlertTriangle aria-hidden="true" size={20} />
            <div>
              <h2>Budget warnings</h2>
              <p>Budget tracking arrives in Phase 6. This panel is ready for warning summaries.</p>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
