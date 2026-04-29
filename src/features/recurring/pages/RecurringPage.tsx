import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { CalendarClock, Pencil, Plus, Save, X } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, Input } from '../../../components/ui'
import {
  recurringFrequencyOptions,
  recurringTransactionTypeOptions,
} from '../../../constants/options'
import { useWorkspaceOutlet } from '../../../hooks/useWorkspaceOutlet'
import type {
  Account,
  Category,
  RecurringFrequency,
  RecurringTransaction,
  RecurringTransactionType,
} from '../../../types/domain'
import { createActivityLog } from '../../activity/services/activityService'
import { listAccounts } from '../../accounts/services/accountService'
import { listCategories } from '../../categories/services/categoryService'
import {
  createRecurringTransaction,
  listRecurringTransactions,
  updateRecurringTransaction,
} from '../services/recurringService'

const today = new Date().toISOString().slice(0, 10)

type RecurringEditDraft = {
  accountId: string
  amount: string
  categoryId: string
  counterpartyAccountId: string
  endDate: string
  frequency: RecurringFrequency
  isActive: boolean
  nextRunDate: string
  recurringTransactionId: string
  startDate: string
  type: RecurringTransactionType
}

export function RecurringPage() {
  const { selectedWorkspace } = useWorkspaceOutlet()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [templates, setTemplates] = useState<RecurringTransaction[]>([])
  const [type, setType] = useState<RecurringTransactionType>('expense')
  const [accountId, setAccountId] = useState('')
  const [counterpartyAccountId, setCounterpartyAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly')
  const [startDate, setStartDate] = useState(today)
  const [nextRunDate, setNextRunDate] = useState(today)
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<RecurringEditDraft | null>(null)
  const [savingTemplateId, setSavingTemplateId] = useState('')

  const filteredCategories = useMemo(
    () =>
      categories.filter((category) =>
        type === 'income'
          ? category.type === 'income'
          : category.type === 'expense' || category.type === 'business_expense',
      ),
    [categories, type],
  )

  const loadPageData = useCallback(async () => {
    if (!selectedWorkspace) {
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const [nextAccounts, nextCategories, nextTemplates] = await Promise.all([
        listAccounts(selectedWorkspace.id),
        listCategories(selectedWorkspace.id),
        listRecurringTransactions(selectedWorkspace.id),
      ])

      setAccounts(nextAccounts)
      setCategories(nextCategories)
      setTemplates(nextTemplates)

      if (!accountId && nextAccounts[0]) {
        setAccountId(nextAccounts[0].id)
      }

      if (!counterpartyAccountId && nextAccounts[1]) {
        setCounterpartyAccountId(nextAccounts[1].id)
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load recurring templates.')
    } finally {
      setIsLoading(false)
    }
  }, [accountId, counterpartyAccountId, selectedWorkspace])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPageData()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadPageData])

  const handleCreateRecurring = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedWorkspace) {
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const template = await createRecurringTransaction({
        accountId,
        amount: Number(amount),
        categoryId: type === 'transfer' ? null : categoryId || null,
        counterpartyAccountId: type === 'transfer' ? counterpartyAccountId : null,
        endDate: endDate || null,
        frequency,
        nextRunDate,
        startDate,
        type,
        workspaceId: selectedWorkspace.id,
      })

      await createActivityLog({
        action: 'created_recurring_transaction',
        description: 'Created a recurring transaction template',
        entityId: template.id,
        entityType: 'recurring_transaction',
        workspaceId: selectedWorkspace.id,
      })

      setAmount('')
      setEndDate('')
      await loadPageData()
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : 'Unable to create recurring template.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveRecurring = async () => {
    if (!editingTemplate || !selectedWorkspace) {
      return
    }

    setSavingTemplateId(editingTemplate.recurringTransactionId)
    setError('')

    try {
      const template = await updateRecurringTransaction({
        accountId: editingTemplate.accountId,
        amount: Number(editingTemplate.amount),
        categoryId: editingTemplate.type === 'transfer' ? null : editingTemplate.categoryId || null,
        counterpartyAccountId:
          editingTemplate.type === 'transfer' ? editingTemplate.counterpartyAccountId : null,
        endDate: editingTemplate.endDate || null,
        frequency: editingTemplate.frequency,
        isActive: editingTemplate.isActive,
        nextRunDate: editingTemplate.nextRunDate,
        recurringTransactionId: editingTemplate.recurringTransactionId,
        startDate: editingTemplate.startDate,
        type: editingTemplate.type,
      })

      await createActivityLog({
        action: 'updated_recurring_transaction',
        description: 'Updated a recurring transaction template',
        entityId: template.id,
        entityType: 'recurring_transaction',
        workspaceId: selectedWorkspace.id,
      })

      setEditingTemplate(null)
      await loadPageData()
    } catch (updateError) {
      setError(
        updateError instanceof Error ? updateError.message : 'Unable to update recurring template.',
      )
    } finally {
      setSavingTemplateId('')
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Recurring foundation</p>
          <h1>Recurring templates</h1>
          <p className="lead">
            Capture repeating income, expenses, and transfers so the workflow is ready for future automation.
          </p>
        </div>
      </header>

      {error && <p className="form-error">{error}</p>}

      {!selectedWorkspace ? (
        <p className="empty-state">Create a space before adding recurring templates.</p>
      ) : (
        <section className="content-grid">
          <Card>
            <CardHeader>
              <Plus aria-hidden="true" size={20} />
              <h2>Add template</h2>
            </CardHeader>
            <CardContent>
              <form className="stack-form" onSubmit={handleCreateRecurring}>
                <label className="field-group">
                  Type
                  <select
                    className="field-input"
                    onChange={(event) => setType(event.target.value as RecurringTransactionType)}
                    value={type}
                  >
                    {recurringTransactionTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field-group">
                  Account
                  <select
                    className="field-input"
                    onChange={(event) => setAccountId(event.target.value)}
                    required
                    value={accountId}
                  >
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </label>

                {type === 'transfer' ? (
                  <label className="field-group">
                    Destination account
                    <select
                      className="field-input"
                      onChange={(event) => setCounterpartyAccountId(event.target.value)}
                      required
                      value={counterpartyAccountId}
                    >
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label className="field-group">
                    Category
                    <select
                      className="field-input"
                      onChange={(event) => setCategoryId(event.target.value)}
                      value={categoryId}
                    >
                      <option value="">No category</option>
                      {filteredCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="field-group">
                  Amount
                  <Input
                    min="0.01"
                    onChange={(event) => setAmount(event.target.value)}
                    required
                    step="0.01"
                    type="number"
                    value={amount}
                  />
                </label>

                <label className="field-group">
                  Frequency
                  <select
                    className="field-input"
                    onChange={(event) => setFrequency(event.target.value as RecurringFrequency)}
                    value={frequency}
                  >
                    {recurringFrequencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field-group">
                  Start date
                  <Input
                    onChange={(event) => setStartDate(event.target.value)}
                    required
                    type="date"
                    value={startDate}
                  />
                </label>

                <label className="field-group">
                  Next run date
                  <Input
                    onChange={(event) => setNextRunDate(event.target.value)}
                    required
                    type="date"
                    value={nextRunDate}
                  />
                </label>

                <label className="field-group">
                  End date
                  <Input
                    onChange={(event) => setEndDate(event.target.value)}
                    type="date"
                    value={endDate}
                  />
                </label>

                <Button disabled={isSubmitting} type="submit">
                  <CalendarClock aria-hidden="true" size={18} />
                  {isSubmitting ? 'Saving...' : 'Save template'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <section className="list-panel">
            <div className="section-heading">
              <h2>Recurring templates</h2>
              <span>{isLoading ? 'Loading' : `${templates.length} saved`}</span>
            </div>

            {templates.length === 0 && !isLoading ? (
              <p className="empty-state">No recurring templates yet.</p>
            ) : (
              <div className="record-list">
                {templates.map((template) => (
                  <div className="record-row record-row-stack" key={template.id}>
                    {editingTemplate?.recurringTransactionId === template.id ? (
                      <span className="inline-edit-fields">
                        <select
                          className="field-input"
                          onChange={(event) =>
                            setEditingTemplate({
                              ...editingTemplate,
                              type: event.target.value as RecurringTransactionType,
                            })
                          }
                          value={editingTemplate.type}
                        >
                          {recurringTransactionTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <select
                          className="field-input"
                          onChange={(event) =>
                            setEditingTemplate({ ...editingTemplate, accountId: event.target.value })
                          }
                          value={editingTemplate.accountId}
                        >
                          {accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name}
                            </option>
                          ))}
                        </select>
                        {editingTemplate.type === 'transfer' ? (
                          <select
                            className="field-input"
                            onChange={(event) =>
                              setEditingTemplate({
                                ...editingTemplate,
                                counterpartyAccountId: event.target.value,
                              })
                            }
                            value={editingTemplate.counterpartyAccountId}
                          >
                            {accounts.map((account) => (
                              <option key={account.id} value={account.id}>
                                {account.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <select
                            className="field-input"
                            onChange={(event) =>
                              setEditingTemplate({
                                ...editingTemplate,
                                categoryId: event.target.value,
                              })
                            }
                            value={editingTemplate.categoryId}
                          >
                            <option value="">No category</option>
                            {categories
                              .filter((category) =>
                                editingTemplate.type === 'income'
                                  ? category.type === 'income'
                                  : category.type === 'expense' || category.type === 'business_expense',
                              )
                              .map((category) => (
                                <option key={category.id} value={category.id}>
                                  {category.name}
                                </option>
                              ))}
                          </select>
                        )}
                        <Input
                          min="0.01"
                          onChange={(event) =>
                            setEditingTemplate({ ...editingTemplate, amount: event.target.value })
                          }
                          required
                          step="0.01"
                          type="number"
                          value={editingTemplate.amount}
                        />
                        <select
                          className="field-input"
                          onChange={(event) =>
                            setEditingTemplate({
                              ...editingTemplate,
                              frequency: event.target.value as RecurringFrequency,
                            })
                          }
                          value={editingTemplate.frequency}
                        >
                          {recurringFrequencyOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <Input
                          onChange={(event) =>
                            setEditingTemplate({ ...editingTemplate, startDate: event.target.value })
                          }
                          required
                          type="date"
                          value={editingTemplate.startDate}
                        />
                        <Input
                          onChange={(event) =>
                            setEditingTemplate({ ...editingTemplate, nextRunDate: event.target.value })
                          }
                          required
                          type="date"
                          value={editingTemplate.nextRunDate}
                        />
                        <Input
                          onChange={(event) =>
                            setEditingTemplate({ ...editingTemplate, endDate: event.target.value })
                          }
                          type="date"
                          value={editingTemplate.endDate}
                        />
                        <label className="checkbox-field">
                          <input
                            checked={editingTemplate.isActive}
                            onChange={(event) =>
                              setEditingTemplate({
                                ...editingTemplate,
                                isActive: event.target.checked,
                              })
                            }
                            type="checkbox"
                          />
                          Active
                        </label>
                      </span>
                    ) : (
                      <span>
                        <strong>{template.type.replace('_', ' ')}</strong>
                        <small>{template.frequency} / next run {template.next_run_date}</small>
                      </span>
                    )}
                    <span className="record-row-meta">
                      <strong>{template.amount.toFixed(2)}</strong>
                      <small>{template.is_active ? 'Active' : 'Paused'}</small>
                      {editingTemplate?.recurringTransactionId === template.id ? (
                        <span className="inline-actions">
                          <Button
                            disabled={savingTemplateId === template.id}
                            onClick={() => void handleSaveRecurring()}
                            type="button"
                            variant="ghost"
                          >
                            <Save aria-hidden="true" size={16} />
                            {savingTemplateId === template.id ? 'Saving...' : 'Save'}
                          </Button>
                          <Button onClick={() => setEditingTemplate(null)} type="button" variant="ghost">
                            <X aria-hidden="true" size={16} />
                            Cancel
                          </Button>
                        </span>
                      ) : (
                        <Button
                          onClick={() =>
                            setEditingTemplate({
                              accountId: template.account_id,
                              amount: String(template.amount),
                              categoryId: template.category_id ?? '',
                              counterpartyAccountId: template.counterparty_account_id ?? '',
                              endDate: template.end_date ?? '',
                              frequency: template.frequency,
                              isActive: template.is_active,
                              nextRunDate: template.next_run_date,
                              recurringTransactionId: template.id,
                              startDate: template.start_date,
                              type: template.type,
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
                ))}
              </div>
            )}
          </section>
        </section>
      )}
    </div>
  )
}
