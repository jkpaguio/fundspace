import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChartNoAxesCombined } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, Input } from '../../../components/ui'
import { monthOptions } from '../../../constants/options'
import {
  calculateMonthlyExpenses,
  calculateMonthlyIncome,
  calculateNetProfit,
  calculateTotalBalance,
} from '../../../lib/calculations'
import { formatCurrency } from '../../../lib/formatCurrency'
import { useWorkspaceOutlet } from '../../../hooks/useWorkspaceOutlet'
import { loadAdvancedReportData } from '../services/reportService'

const currentDate = new Date()

type ReportsState = Awaited<ReturnType<typeof loadAdvancedReportData>>

const emptyReports: ReportsState = {
  accounts: [],
  budgetUsage: [],
  businessChildren: [],
  categories: [],
  debts: [],
  savingsBuckets: [],
  transactions: [],
}

export function ReportsPage() {
  const { selectedWorkspace } = useWorkspaceOutlet()
  const [month, setMonth] = useState(String(currentDate.getMonth() + 1))
  const [year, setYear] = useState(String(currentDate.getFullYear()))
  const [reports, setReports] = useState<ReportsState>(emptyReports)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const loadReports = useCallback(async () => {
    if (!selectedWorkspace) {
      return
    }

    setIsLoading(true)
    setError('')

    try {
      setReports(
        await loadAdvancedReportData(selectedWorkspace.id, Number(month), Number(year)),
      )
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load reports.')
    } finally {
      setIsLoading(false)
    }
  }, [month, selectedWorkspace, year])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadReports()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadReports])

  const summary = useMemo(() => {
    const income = calculateMonthlyIncome(reports.transactions)
    const expenses = calculateMonthlyExpenses(reports.transactions)
    const businessRevenue = reports.businessChildren
      .flatMap((item) => item.sales)
      .reduce((total, sale) => total + sale.revenue, 0)
    const businessExpenses = reports.businessChildren
      .flatMap((item) => item.expenses)
      .reduce((total, expense) => total + expense.amount, 0)

    return {
      businessNetProfit: calculateNetProfit(
        reports.businessChildren
          .flatMap((item) => item.sales)
          .reduce((total, sale) => total + sale.gross_profit, 0),
        businessExpenses,
      ),
      businessRevenue,
      expenses,
      income,
      totalBalance: calculateTotalBalance(reports.accounts),
    }
  }, [reports])

  const spendingByCategory = useMemo(() => {
    const totals = new Map<string, number>()

    reports.transactions
      .filter((transaction) => transaction.direction === 'out' && transaction.category_id)
      .forEach((transaction) => {
        totals.set(
          transaction.category_id!,
          (totals.get(transaction.category_id!) ?? 0) + transaction.amount,
        )
      })

    return Array.from(totals.entries())
      .map(([categoryId, total]) => ({
        name: reports.categories.find((category) => category.id === categoryId)?.name ?? 'Uncategorized',
        total,
      }))
      .sort((first, second) => second.total - first.total)
  }, [reports.categories, reports.transactions])

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Phase 11</p>
          <h1>Advanced reports and insights</h1>
          <p className="lead">
            Review deeper financial summaries across categories, budgets, debts, savings, and business performance.
          </p>
        </div>
      </header>

      {error && <p className="form-error">{error}</p>}

      {!selectedWorkspace ? (
        <p className="empty-state">Create a space before opening advanced reports.</p>
      ) : (
        <>
          <section className="filter-bar">
            <select
              className="field-input"
              onChange={(event) => setMonth(event.target.value)}
              value={month}
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <Input
              min="2024"
              onChange={(event) => setYear(event.target.value)}
              step="1"
              type="number"
              value={year}
            />

            <Button disabled={isLoading} onClick={() => void loadReports()} type="button">
              Refresh reports
            </Button>
          </section>

          <section className="metric-grid">
            <Card>
              <CardHeader>
                <ChartNoAxesCombined aria-hidden="true" size={20} />
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
                <ChartNoAxesCombined aria-hidden="true" size={20} />
                <h2>Income</h2>
              </CardHeader>
              <CardContent>
                <p className="metric-value amount-in">
                  {formatCurrency(summary.income, selectedWorkspace.currency)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <ChartNoAxesCombined aria-hidden="true" size={20} />
                <h2>Expenses</h2>
              </CardHeader>
              <CardContent>
                <p className="metric-value amount-out">
                  {formatCurrency(summary.expenses, selectedWorkspace.currency)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <ChartNoAxesCombined aria-hidden="true" size={20} />
                <h2>Business net profit</h2>
              </CardHeader>
              <CardContent>
                <p className="metric-value">
                  {formatCurrency(summary.businessNetProfit, selectedWorkspace.currency)}
                </p>
              </CardContent>
            </Card>
          </section>

          <section className="content-grid">
            <section className="list-panel">
              <div className="section-heading">
                <h2>Spending by category</h2>
                <span>{isLoading ? 'Loading' : `${spendingByCategory.length} categories`}</span>
              </div>

              {spendingByCategory.length === 0 && !isLoading ? (
                <p className="empty-state">No categorized spending found in this period.</p>
              ) : (
                <div className="record-list">
                  {spendingByCategory.map((item) => (
                    <div className="record-row" key={item.name}>
                      <span>
                        <strong>{item.name}</strong>
                        <small>Period spending</small>
                      </span>
                      <span>{formatCurrency(item.total, selectedWorkspace.currency)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="list-panel">
              <div className="section-heading">
                <h2>Budget usage</h2>
                <span>{reports.budgetUsage.length} budgets</span>
              </div>

              {reports.budgetUsage.length === 0 ? (
                <p className="empty-state">No budgets configured for this period.</p>
              ) : (
                <div className="record-list">
                  {reports.budgetUsage.map((item) => {
                    const category = reports.categories.find(
                      (entry) => entry.id === item.budget.category_id,
                    )

                    return (
                      <div className="record-row" key={item.budget.id}>
                        <span>
                          <strong>{category?.name ?? 'Category'}</strong>
                          <small>{item.status} / {item.usagePercentage.toFixed(1)}%</small>
                        </span>
                        <span>{formatCurrency(item.spent, selectedWorkspace.currency)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </section>

          <section className="content-grid">
            <section className="list-panel">
              <div className="section-heading">
                <h2>Savings progress</h2>
                <span>{reports.savingsBuckets.length} buckets</span>
              </div>
              {reports.savingsBuckets.length === 0 ? (
                <p className="empty-state">No savings buckets found.</p>
              ) : (
                <div className="record-list">
                  {reports.savingsBuckets.map((bucket) => (
                    <div className="record-row" key={bucket.id}>
                      <span>
                        <strong>{bucket.name}</strong>
                        <small>Target progress</small>
                      </span>
                      <span>
                        {formatCurrency(bucket.current_amount, selectedWorkspace.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="list-panel">
              <div className="section-heading">
                <h2>Debt summary</h2>
                <span>{reports.debts.length} debts</span>
              </div>
              {reports.debts.length === 0 ? (
                <p className="empty-state">No debts found.</p>
              ) : (
                <div className="record-list">
                  {reports.debts.map((debt) => (
                    <div className="record-row" key={debt.id}>
                      <span>
                        <strong>{debt.person_name}</strong>
                        <small>{debt.status}</small>
                      </span>
                      <span>
                        {formatCurrency(debt.remaining_amount, selectedWorkspace.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </section>

          <section className="content-grid">
            <section className="list-panel">
              <div className="section-heading">
                <h2>Business sales report</h2>
                <span>{reports.businessChildren.flatMap((item) => item.sales).length} sales</span>
              </div>
              {reports.businessChildren.flatMap((item) => item.sales).length === 0 ? (
                <p className="empty-state">No business sales recorded for this period.</p>
              ) : (
                <div className="record-list">
                  {reports.businessChildren.flatMap((item) =>
                    item.sales.map((sale) => (
                      <div className="record-row" key={sale.id}>
                        <span>
                          <strong>{item.business.name}</strong>
                          <small>{sale.sale_date}</small>
                        </span>
                        <span>{formatCurrency(sale.revenue, selectedWorkspace.currency)}</span>
                      </div>
                    )),
                  )}
                </div>
              )}
            </section>

            <Card>
              <CardHeader>
                <ChartNoAxesCombined aria-hidden="true" size={20} />
                <h2>Report notes</h2>
              </CardHeader>
              <CardContent>
                <div className="record-list">
                  <div className="record-row record-row-stack">
                    <span>
                      <strong>Advanced reports are active</strong>
                      <small>Phase 11 reporting slice</small>
                    </span>
                    <span>
                      Use this screen to review category spending, budget status, savings progress, debts, and business performance for the selected period.
                    </span>
                  </div>
                  <div className="record-row record-row-stack">
                    <span>
                      <strong>AI assistant deferred</strong>
                      <small>Planned for a later period</small>
                    </span>
                    <span>
                      Financial insights and smart recommendations are intentionally left out for now so this phase stays focused on reporting.
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  )
}
