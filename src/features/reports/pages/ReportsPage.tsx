import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChartNoAxesCombined, Download } from 'lucide-react'
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
import type { CSSProperties } from 'react'

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

function getPercent(value: number, max: number) {
  if (max <= 0) {
    return 0
  }

  return Math.min(100, Math.max(0, (value / max) * 100))
}

function escapeCsvValue(value: string | number | null | undefined) {
  const text = String(value ?? '')

  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}

function buildCsv(rows: Array<Array<string | number | null | undefined>>) {
  return rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n')
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

  const dailyCashFlow = useMemo(() => {
    const daysInMonth = new Date(Number(year), Number(month), 0).getDate()
    const days = Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1
      const dateKey = `${year}-${month.padStart(2, '0')}-${String(day).padStart(2, '0')}`

      return {
        dateKey,
        day,
        expenses: 0,
        income: 0,
      }
    })
    const dayMap = new Map(days.map((day) => [day.dateKey, day]))

    reports.transactions.forEach((transaction) => {
      const day = dayMap.get(transaction.transaction_date)

      if (!day) {
        return
      }

      if (transaction.direction === 'in' && transaction.type !== 'transfer_in') {
        day.income += transaction.amount
      }

      if (transaction.direction === 'out' && transaction.type !== 'transfer_out') {
        day.expenses += transaction.amount
      }
    })

    return days
  }, [month, reports.transactions, year])

  const maxDailyCashFlow = useMemo(
    () => Math.max(0, ...dailyCashFlow.map((day) => Math.max(day.income, day.expenses))),
    [dailyCashFlow],
  )

  const maxCategorySpending = useMemo(
    () => Math.max(0, ...spendingByCategory.map((item) => item.total)),
    [spendingByCategory],
  )

  const savingsProgress = useMemo(
    () =>
      reports.savingsBuckets.map((bucket) => ({
        bucket,
        progress: getPercent(bucket.current_amount, bucket.target_amount),
      })),
    [reports.savingsBuckets],
  )

  const selectedMonthLabel = useMemo(
    () => monthOptions.find((option) => option.value === Number(month))?.label ?? month,
    [month],
  )

  const handleExportCsv = () => {
    if (!selectedWorkspace) {
      return
    }

    const csvRows: Array<Array<string | number | null | undefined>> = [
      ['FundSpace report export'],
      ['Space', selectedWorkspace.name],
      ['Period', `${selectedMonthLabel} ${year}`],
      [],
      ['Summary'],
      ['Total balance', summary.totalBalance],
      ['Income', summary.income],
      ['Expenses', summary.expenses],
      ['Business revenue', summary.businessRevenue],
      ['Business net profit', summary.businessNetProfit],
      [],
      ['Transactions'],
      ['Date', 'Type', 'Direction', 'Category', 'Amount', 'Notes'],
      ...reports.transactions.map((transaction) => [
        transaction.transaction_date,
        transaction.type,
        transaction.direction,
        reports.categories.find((category) => category.id === transaction.category_id)?.name ?? 'Uncategorized',
        transaction.amount,
        transaction.notes,
      ]),
      [],
      ['Spending by category'],
      ['Category', 'Total'],
      ...spendingByCategory.map((item) => [item.name, item.total]),
      [],
      ['Budget usage'],
      ['Category', 'Spent', 'Limit', 'Remaining', 'Usage %', 'Status'],
      ...reports.budgetUsage.map((item) => [
        reports.categories.find((category) => category.id === item.budget.category_id)?.name ?? 'Category',
        item.spent,
        item.budget.limit_amount,
        item.remaining,
        item.usagePercentage.toFixed(1),
        item.status,
      ]),
      [],
      ['Savings'],
      ['Bucket', 'Current amount', 'Target amount', 'Progress %'],
      ...reports.savingsBuckets.map((bucket) => [
        bucket.name,
        bucket.current_amount,
        bucket.target_amount,
        getPercent(bucket.current_amount, bucket.target_amount).toFixed(1),
      ]),
      [],
      ['Debts'],
      ['Person', 'Type', 'Remaining amount', 'Original amount', 'Status', 'Due date'],
      ...reports.debts.map((debt) => [
        debt.person_name,
        debt.type,
        debt.remaining_amount,
        debt.original_amount,
        debt.status,
        debt.due_date,
      ]),
      [],
      ['Business sales'],
      ['Business', 'Date', 'Quantity', 'Revenue', 'COGS', 'Gross profit', 'Notes'],
      ...reports.businessChildren.flatMap((item) =>
        item.sales.map((sale) => [
          item.business.name,
          sale.sale_date,
          sale.quantity,
          sale.revenue,
          sale.cogs,
          sale.gross_profit,
          sale.notes,
        ]),
      ),
    ]
    const blob = new Blob([buildCsv(csvRows)], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const filenameSpace = selectedWorkspace.name.replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase()

    link.href = url
    link.download = `fundspace-${filenameSpace || 'space'}-${year}-${month.padStart(2, '0')}-report.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

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
          <section className="filter-bar reports-filter-bar">
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

            <Button disabled={isLoading} onClick={handleExportCsv} type="button" variant="secondary">
              <Download aria-hidden="true" size={16} />
              Export CSV
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

          <section className="content-grid reports-chart-grid">
            <section className="list-panel">
              <div className="section-heading">
                <h2>Cash flow graph</h2>
                <span>{selectedMonthLabel} {year}</span>
              </div>

              <div className="report-column-chart" aria-label="Daily income and expense chart">
                {dailyCashFlow.map((day) => (
                  <div className="report-column" key={day.dateKey}>
                    <div className="report-column-bars">
                      <span
                        className="report-column-bar report-column-bar-income"
                        style={{ '--bar-height': `${getPercent(day.income, maxDailyCashFlow)}%` } as CSSProperties}
                        title={`Day ${day.day} income: ${formatCurrency(day.income, selectedWorkspace.currency)}`}
                      />
                      <span
                        className="report-column-bar report-column-bar-expense"
                        style={{ '--bar-height': `${getPercent(day.expenses, maxDailyCashFlow)}%` } as CSSProperties}
                        title={`Day ${day.day} expenses: ${formatCurrency(day.expenses, selectedWorkspace.currency)}`}
                      />
                    </div>
                    <small>{day.day}</small>
                  </div>
                ))}
              </div>
              <div className="report-chart-legend">
                <span><i className="legend-dot legend-dot-income" />Income</span>
                <span><i className="legend-dot legend-dot-expense" />Expenses</span>
              </div>
            </section>

            <section className="list-panel">
              <div className="section-heading">
                <h2>Category graph</h2>
                <span>Top spending</span>
              </div>

              {spendingByCategory.length === 0 && !isLoading ? (
                <p className="empty-state">No category graph yet for this period.</p>
              ) : (
                <div className="report-bar-list">
                  {spendingByCategory.slice(0, 8).map((item) => (
                    <div className="report-bar-row" key={item.name}>
                      <span>
                        <strong>{item.name}</strong>
                        <small>{formatCurrency(item.total, selectedWorkspace.currency)}</small>
                      </span>
                      <div className="report-bar-track">
                        <i
                          className="report-bar-fill report-bar-fill-expense"
                          style={{ '--bar-width': `${getPercent(item.total, maxCategorySpending)}%` } as CSSProperties}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </section>

          <section className="content-grid reports-chart-grid">
            <section className="list-panel">
              <div className="section-heading">
                <h2>Budget graph</h2>
                <span>{reports.budgetUsage.length} budgets</span>
              </div>

              {reports.budgetUsage.length === 0 ? (
                <p className="empty-state">No budget graph yet for this period.</p>
              ) : (
                <div className="report-bar-list">
                  {reports.budgetUsage.map((item) => {
                    const category = reports.categories.find(
                      (entry) => entry.id === item.budget.category_id,
                    )

                    return (
                      <div className="report-bar-row" key={item.budget.id}>
                        <span>
                          <strong>{category?.name ?? 'Category'}</strong>
                          <small>{item.usagePercentage.toFixed(1)}% used</small>
                        </span>
                        <div className="report-bar-track">
                          <i
                            className={`report-bar-fill report-bar-fill-${item.status}`}
                            style={{ '--bar-width': `${Math.min(100, item.usagePercentage)}%` } as CSSProperties}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            <section className="list-panel">
              <div className="section-heading">
                <h2>Savings graph</h2>
                <span>{reports.savingsBuckets.length} buckets</span>
              </div>

              {savingsProgress.length === 0 ? (
                <p className="empty-state">No savings graph yet.</p>
              ) : (
                <div className="report-bar-list">
                  {savingsProgress.map(({ bucket, progress }) => (
                    <div className="report-bar-row" key={bucket.id}>
                      <span>
                        <strong>{bucket.name}</strong>
                        <small>{progress.toFixed(1)}% funded</small>
                      </span>
                      <div className="report-bar-track">
                        <i
                          className="report-bar-fill report-bar-fill-income"
                          style={{ '--bar-width': `${progress}%` } as CSSProperties}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
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
