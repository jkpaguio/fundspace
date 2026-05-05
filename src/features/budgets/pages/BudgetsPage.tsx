import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, Pencil, Plus, Save, X } from 'lucide-react'
import { SyncBadge } from '../../../components/common/SyncBadge'
import { Button, Card, CardContent, CardHeader, Input, Modal } from '../../../components/ui'
import { budgetStatusLabels, monthOptions } from '../../../constants/options'
import { formatCurrency } from '../../../lib/formatCurrency'
import { useWorkspaceOutlet } from '../../../hooks/useWorkspaceOutlet'
import type { BudgetUsage, Category } from '../../../types/domain'
import { listCategories } from '../../categories/services/categoryService'
import { listMonthlyTransactions } from '../../transactions/services/transactionService'
import { buildBudgetUsage, createBudget, listBudgets, updateBudget } from '../services/budgetService'

type BudgetEditDraft = {
  budgetId: string
  categoryId: string
  limitAmount: string
  warningPercentage: string
}

const now = new Date()

export function BudgetsPage() {
  const { selectedWorkspace } = useWorkspaceOutlet()
  const [categories, setCategories] = useState<Category[]>([])
  const [budgetUsage, setBudgetUsage] = useState<BudgetUsage[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [limitAmount, setLimitAmount] = useState('')
  const [warningPercentage, setWarningPercentage] = useState('80')
  const [month, setMonth] = useState(String(now.getMonth() + 1))
  const [year, setYear] = useState(String(now.getFullYear()))
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<BudgetEditDraft | null>(null)
  const [savingBudgetId, setSavingBudgetId] = useState('')

  const expenseCategories = useMemo(
    () => categories.filter((category) => category.type !== 'income'),
    [categories],
  )

  const loadPageData = useCallback(async () => {
    if (!selectedWorkspace) {
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const selectedMonth = Number(month)
      const selectedYear = Number(year)
      const baseDate = new Date(selectedYear, selectedMonth - 1, 1)

      const [nextCategories, nextBudgets, monthlyTransactions] = await Promise.all([
        listCategories(selectedWorkspace.id),
        listBudgets(selectedWorkspace.id, selectedMonth, selectedYear),
        listMonthlyTransactions(selectedWorkspace.id, baseDate),
      ])

      setCategories(nextCategories)
      setBudgetUsage(buildBudgetUsage(nextBudgets, monthlyTransactions))

      if (!categoryId) {
        const firstCategory = nextCategories.find((item) => item.type !== 'income')

        if (firstCategory) {
          setCategoryId(firstCategory.id)
        }
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load budgets.')
    } finally {
      setIsLoading(false)
    }
  }, [categoryId, month, selectedWorkspace, year])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPageData()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadPageData])

  const warningCount = useMemo(
    () => budgetUsage.filter((item) => item.status !== 'safe').length,
    [budgetUsage],
  )

  const handleCreateBudget = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedWorkspace) {
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      await createBudget({
        categoryId,
        limitAmount: Number(limitAmount),
        month: Number(month),
        warningPercentage: Number(warningPercentage),
        workspaceId: selectedWorkspace.id,
        year: Number(year),
      })
      setLimitAmount('')
      setWarningPercentage('80')
      setIsCreateModalOpen(false)
      await loadPageData()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create budget.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveBudget = async () => {
    if (!editingBudget) {
      return
    }

    setSavingBudgetId(editingBudget.budgetId)
    setError('')

    try {
      await updateBudget({
        budgetId: editingBudget.budgetId,
        categoryId: editingBudget.categoryId,
        limitAmount: Number(editingBudget.limitAmount),
        warningPercentage: Number(editingBudget.warningPercentage),
      })
      setEditingBudget(null)
      await loadPageData()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update budget.')
    } finally {
      setSavingBudgetId('')
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Phase 6 foundation</p>
          <h1>Budgets</h1>
          <p className="lead">
            Set monthly category limits and surface warning states from real transaction totals.
          </p>
        </div>
      </header>

      {error && <p className="form-error">{error}</p>}

      {!selectedWorkspace ? (
        <p className="empty-state">Create a space before setting up budgets.</p>
      ) : (
        <>
          <section className="metric-grid metric-grid-compact">
            <Card>
              <CardHeader>
                <AlertTriangle aria-hidden="true" size={20} />
                <h2>Active warnings</h2>
              </CardHeader>
              <CardContent>
                <p className="metric-value">{warningCount}</p>
              </CardContent>
            </Card>
          </section>

          <>
            <section className="list-panel">
              <div className="section-heading">
                <h2>Monthly budget usage</h2>
                <span className="inline-actions">
                  <span>{isLoading ? 'Loading' : `${budgetUsage.length} budgets`}</span>
                  <Button onClick={() => setIsCreateModalOpen(true)} type="button">
                    <Plus aria-hidden="true" size={18} />
                    Create budget
                  </Button>
                </span>
              </div>

              {budgetUsage.length === 0 && !isLoading ? (
                <p className="empty-state">No budgets yet for the selected month.</p>
              ) : (
                <div className="record-list">
                  {budgetUsage.map((item) => {
                    const category = categories.find(
                      (entry) => entry.id === item.budget.category_id,
                    )

                    return (
                      <div className="record-row record-row-stack" key={item.budget.id}>
                        {editingBudget?.budgetId === item.budget.id ? (
                          <span className="inline-edit-fields">
                            <select
                              className="field-input"
                              onChange={(event) =>
                                setEditingBudget({
                                  ...editingBudget,
                                  categoryId: event.target.value,
                                })
                              }
                              value={editingBudget.categoryId}
                            >
                              {expenseCategories.map((entry) => (
                                <option key={entry.id} value={entry.id}>
                                  {entry.name}
                                </option>
                              ))}
                            </select>
                            <Input
                              min="0.01"
                              onChange={(event) =>
                                setEditingBudget({
                                  ...editingBudget,
                                  limitAmount: event.target.value,
                                })
                              }
                              required
                              step="0.01"
                              type="number"
                              value={editingBudget.limitAmount}
                            />
                            <Input
                              max="100"
                              min="1"
                              onChange={(event) =>
                                setEditingBudget({
                                  ...editingBudget,
                                  warningPercentage: event.target.value,
                                })
                              }
                              required
                              step="0.01"
                              type="number"
                              value={editingBudget.warningPercentage}
                            />
                          </span>
                        ) : (
                          <span>
                            <strong>{category?.name ?? 'Category'}</strong>
                            <small>
                              {budgetStatusLabels[item.status]} at {item.usagePercentage.toFixed(1)}%
                            </small>
                            <SyncBadge status={(item.budget as { sync_status?: string }).sync_status} />
                          </span>
                        )}
                        <span className="record-row-meta">
                          <strong>
                            {formatCurrency(item.spent, selectedWorkspace.currency)} /{' '}
                            {formatCurrency(item.budget.limit_amount, selectedWorkspace.currency)}
                          </strong>
                          <small>
                            Remaining {formatCurrency(item.remaining, selectedWorkspace.currency)}
                          </small>
                          {editingBudget?.budgetId === item.budget.id ? (
                            <span className="inline-actions">
                              <Button
                                disabled={savingBudgetId === item.budget.id}
                                onClick={() => void handleSaveBudget()}
                                type="button"
                                variant="ghost"
                              >
                                <Save aria-hidden="true" size={16} />
                                {savingBudgetId === item.budget.id ? 'Saving...' : 'Save'}
                              </Button>
                              <Button onClick={() => setEditingBudget(null)} type="button" variant="ghost">
                                <X aria-hidden="true" size={16} />
                                Cancel
                              </Button>
                            </span>
                          ) : (
                            <Button
                              onClick={() =>
                                setEditingBudget({
                                  budgetId: item.budget.id,
                                  categoryId: item.budget.category_id,
                                  limitAmount: String(item.budget.limit_amount),
                                  warningPercentage: String(item.budget.warning_percentage),
                                })
                              }
                              type="button"
                              variant="ghost"
                            >
                              <Pencil aria-hidden="true" size={16} />
                              Edit
                            </Button>
                          )}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            <Modal
              description="Set a monthly limit for one spending category."
              isOpen={isCreateModalOpen}
              onClose={() => setIsCreateModalOpen(false)}
              title="Create budget"
            >
              <form className="stack-form" onSubmit={handleCreateBudget}>
                <label className="field-group">
                  Category
                  <select
                    className="field-input"
                    onChange={(event) => setCategoryId(event.target.value)}
                    required
                    value={categoryId}
                  >
                    {expenseCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field-group">
                  Month
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
                </label>

                <label className="field-group">
                  Year
                  <Input
                    min="2024"
                    onChange={(event) => setYear(event.target.value)}
                    required
                    step="1"
                    type="number"
                    value={year}
                  />
                </label>

                <label className="field-group">
                  Limit amount
                  <Input
                    min="0.01"
                    onChange={(event) => setLimitAmount(event.target.value)}
                    required
                    step="0.01"
                    type="number"
                    value={limitAmount}
                  />
                </label>

                <label className="field-group">
                  Warning percentage
                  <Input
                    max="100"
                    min="1"
                    onChange={(event) => setWarningPercentage(event.target.value)}
                    required
                    step="0.01"
                    type="number"
                    value={warningPercentage}
                  />
                </label>

                <Button disabled={isSubmitting || expenseCategories.length === 0} type="submit">
                  <Plus aria-hidden="true" size={18} />
                  {isSubmitting ? 'Creating...' : 'Create budget'}
                </Button>
              </form>
            </Modal>
          </>
        </>
      )}
    </div>
  )
}
