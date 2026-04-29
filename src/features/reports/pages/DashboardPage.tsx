import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  BriefcaseBusiness,
  Package,
  PiggyBank,
  TrendingUp,
  WalletCards,
} from 'lucide-react'
import { EmptyState } from '../../../components/common/EmptyState'
import { PageHeader } from '../../../components/common/PageHeader'
import { Card, CardContent, CardHeader } from '../../../components/ui'
import {
  calculateMonthlyExpenses,
  calculateMonthlyIncome,
  calculateNetProfit,
  calculateNetSavings,
  calculateTotalBalance,
} from '../../../lib/calculations'
import { budgetStatusLabels } from '../../../constants/options'
import { formatCurrency } from '../../../lib/formatCurrency'
import { useWorkspaceOutlet } from '../../../hooks/useWorkspaceOutlet'
import type { WorkspaceType } from '../../../types/domain'
import { loadDashboardData, type DashboardData } from '../services/dashboardService'

const emptyDashboard: DashboardData = {
  accounts: [],
  budgetUsage: [],
  businessChildren: [],
  categories: [],
  debts: [],
  monthlyTransactions: [],
  recentTransactions: [],
  savingsBuckets: [],
}

const dashboardCopy: Record<
  WorkspaceType,
  { eyebrow: string; heading: string; lead: string; variantTitle: string; variantLead: string }
> = {
  business: {
    eyebrow: 'Business dashboard',
    heading: 'Operations and profitability',
    lead: 'Track cash movement, sales performance, and business operating pressure from one space view.',
    variantLead: 'This dashboard emphasizes operating results, product activity, and business cash movement.',
    variantTitle: 'Business space focus',
  },
  family: {
    eyebrow: 'Family dashboard',
    heading: 'Shared money and household goals',
    lead: 'See income, spending, savings progress, and debt commitments for your shared household space.',
    variantLead: 'This dashboard emphasizes shared spending discipline, family savings targets, and open obligations.',
    variantTitle: 'Family space focus',
  },
  other: {
    eyebrow: 'Space dashboard',
    heading: 'Monthly financial status',
    lead: 'Review balances, money flow, savings progress, and debt pressure for the active space.',
    variantLead: 'This dashboard emphasizes practical money flow, reserve building, and upcoming liabilities.',
    variantTitle: 'Space focus',
  },
  personal: {
    eyebrow: 'Personal dashboard',
    heading: 'Your money at a glance',
    lead: 'Review balances, monthly cash flow, savings goals, and debt pressure for your personal space.',
    variantLead: 'This dashboard emphasizes daily money visibility, savings momentum, and budget awareness.',
    variantTitle: 'Personal space focus',
  },
  side_hustle: {
    eyebrow: 'Side hustle dashboard',
    heading: 'Sales, costs, and cash flow',
    lead: 'See whether your side hustle is bringing in revenue, covering costs, and staying healthy month to month.',
    variantLead: 'This dashboard emphasizes lightweight business operations, product output, and owner cash visibility.',
    variantTitle: 'Side hustle focus',
  },
}

export function DashboardPage() {
  const { selectedWorkspace } = useWorkspaceOutlet()
  const [dashboard, setDashboard] = useState<DashboardData>(emptyDashboard)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const loadDashboard = useCallback(async () => {
    if (!selectedWorkspace) {
      return
    }

    setIsLoading(true)
    setError('')

    try {
      setDashboard(await loadDashboardData(selectedWorkspace.id, selectedWorkspace.type))
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

  const isBusinessWorkspace =
    selectedWorkspace?.type === 'business' || selectedWorkspace?.type === 'side_hustle'
  const copy = selectedWorkspace ? dashboardCopy[selectedWorkspace.type] : dashboardCopy.personal

  const summary = useMemo(() => {
    const income = calculateMonthlyIncome(dashboard.monthlyTransactions)
    const expenses = calculateMonthlyExpenses(dashboard.monthlyTransactions)
    const businessRevenue = dashboard.businessChildren
      .flatMap((item) => item.sales)
      .reduce((total, sale) => total + sale.revenue, 0)
    const businessGrossProfit = dashboard.businessChildren
      .flatMap((item) => item.sales)
      .reduce((total, sale) => total + sale.gross_profit, 0)
    const businessExpenses = dashboard.businessChildren
      .flatMap((item) => item.expenses)
      .reduce((total, expense) => total + expense.amount, 0)
    const totalDebtRemaining = dashboard.debts
      .filter((debt) => debt.status === 'active')
      .reduce((total, debt) => total + debt.remaining_amount, 0)
    const totalSavingsAllocated = dashboard.savingsBuckets.reduce(
      (total, bucket) => total + bucket.current_amount,
      0,
    )
    const savingsTargetTotal = dashboard.savingsBuckets.reduce(
      (total, bucket) => total + bucket.target_amount,
      0,
    )
    const activeBudgetWarnings = dashboard.budgetUsage.filter((item) => item.status !== 'safe').length

    return {
      activeBudgetWarnings,
      activeDebtCount: dashboard.debts.filter((debt) => debt.status === 'active').length,
      businessExpenses,
      businessGrossProfit,
      businessNetProfit: calculateNetProfit(businessGrossProfit, businessExpenses),
      businessRevenue,
      expenses,
      income,
      netSavings: calculateNetSavings(income, expenses),
      openBusinessCount: dashboard.businessChildren.length,
      productCount: dashboard.businessChildren.reduce(
        (total, item) => total + item.products.length,
        0,
      ),
      salesCount: dashboard.businessChildren.reduce((total, item) => total + item.sales.length, 0),
      savingsTargetTotal,
      totalBalance: calculateTotalBalance(dashboard.accounts),
      totalDebtRemaining,
      totalSavingsAllocated,
    }
  }, [dashboard])

  const topSpendingCategories = useMemo(() => {
    const categoryTotals = new Map<string, number>()

    dashboard.monthlyTransactions
      .filter((transaction) => transaction.direction === 'out' && transaction.category_id)
      .forEach((transaction) => {
        const categoryId = transaction.category_id as string

        categoryTotals.set(
          categoryId,
          (categoryTotals.get(categoryId) ?? 0) + transaction.amount,
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

  const budgetWarnings = useMemo(
    () =>
      dashboard.budgetUsage
        .filter((item) => item.status !== 'safe')
        .sort((first, second) => second.usagePercentage - first.usagePercentage)
        .slice(0, 3),
    [dashboard.budgetUsage],
  )

  const savingsHighlights = useMemo(
    () =>
      [...dashboard.savingsBuckets]
        .sort((first, second) => second.current_amount - first.current_amount)
        .slice(0, 3),
    [dashboard.savingsBuckets],
  )

  const debtHighlights = useMemo(
    () =>
      dashboard.debts
        .filter((debt) => debt.status === 'active')
        .sort((first, second) => second.remaining_amount - first.remaining_amount)
        .slice(0, 3),
    [dashboard.debts],
  )

  const businessHighlights = useMemo(
    () =>
      dashboard.businessChildren.map((item) => {
        const revenue = item.sales.reduce((total, sale) => total + sale.revenue, 0)
        const grossProfit = item.sales.reduce((total, sale) => total + sale.gross_profit, 0)
        const expenses = item.expenses.reduce((total, expense) => total + expense.amount, 0)

        return {
          expenseCount: item.expenses.length,
          netProfit: calculateNetProfit(grossProfit, expenses),
          productCount: item.products.length,
          revenue,
          saleCount: item.sales.length,
          title: item.business.name,
        }
      }),
    [dashboard.businessChildren],
  )

  return (
    <div className="page-stack">
      <PageHeader eyebrow={copy.eyebrow} heading={copy.heading} lead={copy.lead} />

      {error && <p className="form-error">{error}</p>}

      {!selectedWorkspace ? (
        <EmptyState
          description="Pick a space first and FundSpace will show balances, activity, and summaries for that money area."
          title="Your dashboard needs a space"
        />
      ) : (
        <>
          <section className="dashboard-variant-hero">
            <div>
              <p className="eyebrow">{copy.variantTitle}</p>
              <h2>{selectedWorkspace.name}</h2>
              <p>{copy.variantLead}</p>
            </div>
            <div className="dashboard-variant-tags">
              <span className="badge">{selectedWorkspace.type.replace('_', ' ')}</span>
              <span className="badge">{selectedWorkspace.currency}</span>
              <span className="badge">{isBusinessWorkspace ? 'operations view' : 'household view'}</span>
            </div>
          </section>

          {isBusinessWorkspace ? (
            <>
              <section className="metric-grid">
                <Card>
                  <CardHeader>
                    <WalletCards aria-hidden="true" size={20} />
                    <h2>Total cash balance</h2>
                  </CardHeader>
                  <CardContent>
                    <p className="metric-value">
                      {formatCurrency(summary.totalBalance, selectedWorkspace.currency)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <TrendingUp aria-hidden="true" size={20} />
                    <h2>Revenue this month</h2>
                  </CardHeader>
                  <CardContent>
                    <p className="metric-value amount-in">
                      {formatCurrency(summary.businessRevenue, selectedWorkspace.currency)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <ArrowDownCircle aria-hidden="true" size={20} />
                    <h2>Operating expenses</h2>
                  </CardHeader>
                  <CardContent>
                    <p className="metric-value amount-out">
                      {formatCurrency(summary.businessExpenses, selectedWorkspace.currency)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <BriefcaseBusiness aria-hidden="true" size={20} />
                    <h2>Net profit</h2>
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
                    <h2>Business space summary</h2>
                    <span>{isLoading ? 'Loading' : `${summary.openBusinessCount} businesses`}</span>
                  </div>

                  <div className="record-list">
                    <div className="record-row">
                      <span>
                        <strong>Active businesses</strong>
                        <small>Profiles in this space</small>
                      </span>
                      <span>{summary.openBusinessCount}</span>
                    </div>
                    <div className="record-row">
                      <span>
                        <strong>Products tracked</strong>
                        <small>Costing records available</small>
                      </span>
                      <span>{summary.productCount}</span>
                    </div>
                    <div className="record-row">
                      <span>
                        <strong>Sales logged this month</strong>
                        <small>Revenue-generating entries</small>
                      </span>
                      <span>{summary.salesCount}</span>
                    </div>
                    <div className="record-row">
                      <span>
                        <strong>Ledger income this month</strong>
                        <small>All incoming cash movement</small>
                      </span>
                      <span>{formatCurrency(summary.income, selectedWorkspace.currency)}</span>
                    </div>
                  </div>
                </section>

                <section className="list-panel">
                  <div className="section-heading">
                    <h2>Business snapshots</h2>
                    <span>{businessHighlights.length} tracked</span>
                  </div>

                  {businessHighlights.length === 0 ? (
                    <EmptyState
                      description="Create a business profile and start recording products, sales, or expenses to populate the operations view."
                      title="No business summaries yet"
                    />
                  ) : (
                    <div className="record-list">
                      {businessHighlights.map((item) => (
                        <div className="record-row record-row-stack" key={item.title}>
                          <span>
                            <strong>{item.title}</strong>
                            <small>{item.productCount} products / {item.saleCount} sales / {item.expenseCount} expenses</small>
                          </span>
                          <span className="record-row-meta">
                            <strong>{formatCurrency(item.netProfit, selectedWorkspace.currency)}</strong>
                            <small>{formatCurrency(item.revenue, selectedWorkspace.currency)} revenue</small>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </section>
            </>
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
                    <h2>Personal and family summary</h2>
                    <span>{isLoading ? 'Loading' : `${dashboard.savingsBuckets.length} goals`}</span>
                  </div>

                  <div className="record-list">
                    <div className="record-row">
                      <span>
                        <strong>Savings allocated</strong>
                        <small>Total across active buckets</small>
                      </span>
                      <span>{formatCurrency(summary.totalSavingsAllocated, selectedWorkspace.currency)}</span>
                    </div>
                    <div className="record-row">
                      <span>
                        <strong>Savings targets</strong>
                        <small>Combined goal amount</small>
                      </span>
                      <span>{formatCurrency(summary.savingsTargetTotal, selectedWorkspace.currency)}</span>
                    </div>
                    <div className="record-row">
                      <span>
                        <strong>Budget warnings</strong>
                        <small>Categories needing attention</small>
                      </span>
                      <span>{summary.activeBudgetWarnings}</span>
                    </div>
                    <div className="record-row">
                      <span>
                        <strong>Open debt pressure</strong>
                        <small>{summary.activeDebtCount} active obligations</small>
                      </span>
                      <span>{formatCurrency(summary.totalDebtRemaining, selectedWorkspace.currency)}</span>
                    </div>
                  </div>
                </section>

                <section className="list-panel">
                  <div className="section-heading">
                    <h2>Savings highlights</h2>
                    <span>{savingsHighlights.length} shown</span>
                  </div>

                  {savingsHighlights.length === 0 ? (
                    <EmptyState
                      description="Create a savings bucket to start tracking emergency funds, travel goals, or family reserve targets."
                      title="No savings goals yet"
                    />
                  ) : (
                    <div className="record-list">
                      {savingsHighlights.map((bucket) => (
                        <div className="record-row record-row-stack" key={bucket.id}>
                          <span>
                            <strong>{bucket.name}</strong>
                            <small>
                              {bucket.target_amount > 0
                                ? `Target ${formatCurrency(bucket.target_amount, selectedWorkspace.currency)}`
                                : 'No target amount set'}
                            </small>
                          </span>
                          <span className="record-row-meta">
                            <strong>{formatCurrency(bucket.current_amount, selectedWorkspace.currency)}</strong>
                            <small>{bucket.allocation_percentage}% suggested allocation</small>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </section>
            </>
          )}

          <section className="content-grid">
            <section className="list-panel">
              <div className="section-heading">
                <h2>Recent transactions</h2>
                <span>{isLoading ? 'Loading' : `${dashboard.recentTransactions.length} latest`}</span>
              </div>

              {dashboard.recentTransactions.length === 0 && !isLoading ? (
                <EmptyState
                  description="Record an income or expense to begin populating your recent activity feed."
                  title="No transactions yet"
                />
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
                <h2>{isBusinessWorkspace ? 'Operating watchlist' : 'Top spending categories'}</h2>
                <span>This month</span>
              </div>

              {isBusinessWorkspace ? (
                businessHighlights.length === 0 ? (
                  <EmptyState
                    description="Business operating highlights will appear here after products, sales, or expenses are recorded."
                    title="No operating watchlist yet"
                  />
                ) : (
                  <div className="record-list">
                    {businessHighlights.slice(0, 5).map((item) => (
                      <div className="record-row" key={item.title}>
                        <span>
                          <strong>{item.title}</strong>
                          <small>{item.saleCount} sales / {item.productCount} products</small>
                        </span>
                        <span>{formatCurrency(item.netProfit, selectedWorkspace.currency)}</span>
                      </div>
                    ))}
                  </div>
                )
              ) : topSpendingCategories.length === 0 ? (
                <EmptyState
                  description="Categorized outgoing transactions will appear here once spending starts getting tagged."
                  title="No spending categories to compare"
                />
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

          {!isBusinessWorkspace && (
            <section className="content-grid">
              <section className="list-panel">
                <div className="section-heading">
                  <h2>Debt snapshot</h2>
                  <span>{debtHighlights.length} active</span>
                </div>

                {debtHighlights.length === 0 ? (
                  <EmptyState
                    description="Active debts will appear here once you add a loan, borrowed amount, or credit card balance."
                    title="No active debts"
                  />
                ) : (
                  <div className="record-list">
                    {debtHighlights.map((debt) => (
                      <div className="record-row" key={debt.id}>
                        <span>
                          <strong>{debt.person_name}</strong>
                          <small>{debt.type.replace('_', ' ')} / {debt.status}</small>
                        </span>
                        <span>{formatCurrency(debt.remaining_amount, selectedWorkspace.currency)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="list-panel">
                <div className="section-heading">
                  <h2>Budget watchlist</h2>
                  <span>{dashboard.budgetUsage.length} budgets</span>
                </div>

                {budgetWarnings.length === 0 ? (
                  <EmptyState
                    description="Monthly budget warnings will show here once budgets are configured and spending approaches their limits."
                    title="No budget warnings right now"
                  />
                ) : (
                  <div className="record-list">
                    {budgetWarnings.map((item) => {
                      const category = dashboard.categories.find(
                        (entry) => entry.id === item.budget.category_id,
                      )

                      return (
                        <div className="record-row record-row-stack" key={item.budget.id}>
                          <span>
                            <strong>{category?.name ?? 'Category'}</strong>
                            <small>
                              {budgetStatusLabels[item.status]} at {item.usagePercentage.toFixed(1)}%
                            </small>
                          </span>
                          <span className="record-row-meta">
                            <strong>{formatCurrency(item.spent, selectedWorkspace.currency)}</strong>
                            <small>
                              of {formatCurrency(item.budget.limit_amount, selectedWorkspace.currency)}
                            </small>
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            </section>
          )}

          {isBusinessWorkspace ? (
            <section className="budget-warning">
              <Package aria-hidden="true" size={20} />
              <div>
                <h2>Operations note</h2>
                <p>
                  Use the Business module to add product costing, record sales, and capture operating expenses so this space reflects real profitability.
                </p>
              </div>
            </section>
          ) : (
            <section className="budget-warning">
              <AlertTriangle aria-hidden="true" size={20} />
              <div>
                <h2>Household planning note</h2>
                {budgetWarnings.length === 0 ? (
                  <p>No budget warnings right now. Add monthly budgets in the Budgets screen to monitor category limits.</p>
                ) : (
                  <div className="budget-warning-list">
                    {budgetWarnings.map((item) => {
                      const category = dashboard.categories.find(
                        (entry) => entry.id === item.budget.category_id,
                      )

                      return (
                        <div className="budget-warning-item" key={item.budget.id}>
                          <strong>{category?.name ?? 'Category'}</strong>
                          <span>
                            {budgetStatusLabels[item.status]} at {item.usagePercentage.toFixed(1)}%
                          </span>
                          <span>
                            {formatCurrency(item.spent, selectedWorkspace.currency)} spent of{' '}
                            {formatCurrency(item.budget.limit_amount, selectedWorkspace.currency)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
