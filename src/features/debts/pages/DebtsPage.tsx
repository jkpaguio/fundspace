import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { CreditCard, Pencil, Plus, Save, X } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, Input } from '../../../components/ui'
import { debtTypeOptions } from '../../../constants/options'
import { formatCurrency } from '../../../lib/formatCurrency'
import { useWorkspaceOutlet } from '../../../hooks/useWorkspaceOutlet'
import type { Account, Debt, DebtStatus, DebtType } from '../../../types/domain'
import { createActivityLog } from '../../activity/services/activityService'
import { listAccounts } from '../../accounts/services/accountService'
import {
  createDebt,
  createDebtPayment,
  listDebtPayments,
  listDebts,
  updateDebt,
} from '../services/debtService'

const today = new Date().toISOString().slice(0, 10)
const debtStatusOptions: DebtStatus[] = ['active', 'paid', 'cancelled']

type DebtEditDraft = {
  debtId: string
  dueDate: string
  interestRate: string
  notes: string
  originalAmount: string
  personName: string
  remainingAmount: string
  status: DebtStatus
  type: DebtType
}

export function DebtsPage() {
  const { selectedWorkspace } = useWorkspaceOutlet()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null)
  const [payments, setPayments] = useState<Array<{ amount: number; payment_date: string; id: string }>>([])
  const [type, setType] = useState<DebtType>('loan')
  const [personName, setPersonName] = useState('')
  const [originalAmount, setOriginalAmount] = useState('')
  const [interestRate, setInterestRate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [paymentAccountId, setPaymentAccountId] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(today)
  const [paymentNotes, setPaymentNotes] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmittingDebt, setIsSubmittingDebt] = useState(false)
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)
  const [editingDebt, setEditingDebt] = useState<DebtEditDraft | null>(null)
  const [savingDebtId, setSavingDebtId] = useState('')

  const loadPageData = useCallback(async () => {
    if (!selectedWorkspace) {
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const [nextAccounts, nextDebts] = await Promise.all([
        listAccounts(selectedWorkspace.id),
        listDebts(selectedWorkspace.id),
      ])

      setAccounts(nextAccounts)
      setDebts(nextDebts)

      if (!paymentAccountId && nextAccounts[0]) {
        setPaymentAccountId(nextAccounts[0].id)
      }

      const nextSelectedDebt =
        nextDebts.find((debt) => debt.id === selectedDebt?.id) ?? nextDebts[0] ?? null
      setSelectedDebt(nextSelectedDebt)

      if (nextSelectedDebt) {
        setPayments(await listDebtPayments(nextSelectedDebt.id))
      } else {
        setPayments([])
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load debts.')
    } finally {
      setIsLoading(false)
    }
  }, [paymentAccountId, selectedDebt?.id, selectedWorkspace])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPageData()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadPageData])

  const handleCreateDebt = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedWorkspace) {
      return
    }

    setIsSubmittingDebt(true)
    setError('')

    try {
      const debt = await createDebt({
        dueDate: dueDate || null,
        interestRate: interestRate ? Number(interestRate) : null,
        notes,
        originalAmount: Number(originalAmount),
        personName,
        type,
        workspaceId: selectedWorkspace.id,
      })

      await createActivityLog({
        action: 'created_debt',
        description: 'Created a debt record',
        entityId: debt.id,
        entityType: 'debt',
        workspaceId: selectedWorkspace.id,
      })

      setPersonName('')
      setOriginalAmount('')
      setInterestRate('')
      setDueDate('')
      setNotes('')
      await loadPageData()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create debt.')
    } finally {
      setIsSubmittingDebt(false)
    }
  }

  const handleCreatePayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedDebt) {
      return
    }

    setIsSubmittingPayment(true)
    setError('')

    try {
      await createDebtPayment({
        accountId: paymentAccountId,
        amount: Number(paymentAmount),
        date: paymentDate,
        debtId: selectedDebt.id,
        notes: paymentNotes,
      })
      setPaymentAmount('')
      setPaymentNotes('')
      await loadPageData()
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : 'Unable to record payment.')
    } finally {
      setIsSubmittingPayment(false)
    }
  }

  const handleSaveDebt = async () => {
    if (!editingDebt) {
      return
    }

    setSavingDebtId(editingDebt.debtId)
    setError('')

    try {
      await updateDebt({
        debtId: editingDebt.debtId,
        dueDate: editingDebt.dueDate || null,
        interestRate: editingDebt.interestRate ? Number(editingDebt.interestRate) : null,
        notes: editingDebt.notes,
        originalAmount: Number(editingDebt.originalAmount),
        personName: editingDebt.personName,
        remainingAmount: Number(editingDebt.remainingAmount),
        status: editingDebt.status,
        type: editingDebt.type,
      })
      setEditingDebt(null)
      await loadPageData()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update debt.')
    } finally {
      setSavingDebtId('')
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Debt tracking</p>
          <h1>Debts and payments</h1>
          <p className="lead">
            Track liabilities, remaining balances, and ledger-backed payment records.
          </p>
        </div>
      </header>

      {error && <p className="form-error">{error}</p>}

      {!selectedWorkspace ? (
        <p className="empty-state">Create a space before tracking debts.</p>
      ) : (
        <>
          <section className="content-grid">
            <Card>
              <CardHeader>
                <Plus aria-hidden="true" size={20} />
                <h2>Add debt</h2>
              </CardHeader>
              <CardContent>
                <form className="stack-form" onSubmit={handleCreateDebt}>
                  <label className="field-group">
                    Type
                    <select
                      className="field-input"
                      onChange={(event) => setType(event.target.value as DebtType)}
                      value={type}
                    >
                      {debtTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field-group">
                    Person or institution
                    <Input
                      onChange={(event) => setPersonName(event.target.value)}
                      placeholder="Bank or lender name"
                      required
                      value={personName}
                    />
                  </label>

                  <label className="field-group">
                    Original amount
                    <Input
                      min="0.01"
                      onChange={(event) => setOriginalAmount(event.target.value)}
                      required
                      step="0.01"
                      type="number"
                      value={originalAmount}
                    />
                  </label>

                  <label className="field-group">
                    Interest rate
                    <Input
                      min="0"
                      onChange={(event) => setInterestRate(event.target.value)}
                      step="0.01"
                      type="number"
                      value={interestRate}
                    />
                  </label>

                  <label className="field-group">
                    Due date
                    <Input
                      onChange={(event) => setDueDate(event.target.value)}
                      type="date"
                      value={dueDate}
                    />
                  </label>

                  <label className="field-group">
                    Notes
                    <Input
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Monthly card balance"
                      value={notes}
                    />
                  </label>

                  <Button disabled={isSubmittingDebt} type="submit">
                    <Plus aria-hidden="true" size={18} />
                    {isSubmittingDebt ? 'Saving...' : 'Save debt'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CreditCard aria-hidden="true" size={20} />
                <h2>Record payment</h2>
              </CardHeader>
              <CardContent>
                <form className="stack-form" onSubmit={handleCreatePayment}>
                  <label className="field-group">
                    Debt
                    <select
                      className="field-input"
                      disabled={debts.length === 0}
                      onChange={(event) =>
                        setSelectedDebt(debts.find((debt) => debt.id === event.target.value) ?? null)
                      }
                      value={selectedDebt?.id ?? ''}
                    >
                      {debts.map((debt) => (
                        <option key={debt.id} value={debt.id}>
                          {debt.person_name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field-group">
                    Payment account
                    <select
                      className="field-input"
                      disabled={accounts.length === 0}
                      onChange={(event) => setPaymentAccountId(event.target.value)}
                      value={paymentAccountId}
                    >
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field-group">
                    Amount
                    <Input
                      min="0.01"
                      onChange={(event) => setPaymentAmount(event.target.value)}
                      required
                      step="0.01"
                      type="number"
                      value={paymentAmount}
                    />
                  </label>

                  <label className="field-group">
                    Date
                    <Input
                      onChange={(event) => setPaymentDate(event.target.value)}
                      required
                      type="date"
                      value={paymentDate}
                    />
                  </label>

                  <label className="field-group">
                    Notes
                    <Input
                      onChange={(event) => setPaymentNotes(event.target.value)}
                      placeholder="Partial payment"
                      value={paymentNotes}
                    />
                  </label>

                  <Button disabled={isSubmittingPayment || !selectedDebt} type="submit">
                    <CreditCard aria-hidden="true" size={18} />
                    {isSubmittingPayment ? 'Recording...' : 'Record payment'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </section>

          <section className="content-grid">
            <section className="list-panel">
              <div className="section-heading">
                <h2>Debt list</h2>
                <span>{isLoading ? 'Loading' : `${debts.length} debts`}</span>
              </div>

              {debts.length === 0 && !isLoading ? (
                <p className="empty-state">No debts yet.</p>
              ) : (
                <div className="record-list">
                  {debts.map((debt) => (
                    <div className="record-row record-row-stack" key={debt.id}>
                      {editingDebt?.debtId === debt.id ? (
                        <span className="inline-edit-fields">
                          <Input
                            onChange={(event) =>
                              setEditingDebt({ ...editingDebt, personName: event.target.value })
                            }
                            required
                            value={editingDebt.personName}
                          />
                          <select
                            className="field-input"
                            onChange={(event) =>
                              setEditingDebt({
                                ...editingDebt,
                                type: event.target.value as DebtType,
                              })
                            }
                            value={editingDebt.type}
                          >
                            {debtTypeOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <select
                            className="field-input"
                            onChange={(event) =>
                              setEditingDebt({
                                ...editingDebt,
                                status: event.target.value as DebtStatus,
                              })
                            }
                            value={editingDebt.status}
                          >
                            {debtStatusOptions.map((statusOption) => (
                              <option key={statusOption} value={statusOption}>
                                {statusOption}
                              </option>
                            ))}
                          </select>
                          <Input
                            min="0.01"
                            onChange={(event) =>
                              setEditingDebt({
                                ...editingDebt,
                                originalAmount: event.target.value,
                              })
                            }
                            required
                            step="0.01"
                            type="number"
                            value={editingDebt.originalAmount}
                          />
                          <Input
                            min="0"
                            onChange={(event) =>
                              setEditingDebt({
                                ...editingDebt,
                                remainingAmount: event.target.value,
                              })
                            }
                            required
                            step="0.01"
                            type="number"
                            value={editingDebt.remainingAmount}
                          />
                          <Input
                            min="0"
                            onChange={(event) =>
                              setEditingDebt({
                                ...editingDebt,
                                interestRate: event.target.value,
                              })
                            }
                            step="0.01"
                            type="number"
                            value={editingDebt.interestRate}
                          />
                          <Input
                            onChange={(event) =>
                              setEditingDebt({ ...editingDebt, dueDate: event.target.value })
                            }
                            type="date"
                            value={editingDebt.dueDate}
                          />
                          <Input
                            onChange={(event) =>
                              setEditingDebt({ ...editingDebt, notes: event.target.value })
                            }
                            value={editingDebt.notes}
                          />
                        </span>
                      ) : (
                        <button
                          className="record-row-action"
                          onClick={() => setSelectedDebt(debt)}
                          type="button"
                        >
                          <span>
                            <strong>{debt.person_name}</strong>
                            <small>{debt.type.replace('_', ' ')} / {debt.status}</small>
                          </span>
                          <span>{formatCurrency(debt.remaining_amount, selectedWorkspace.currency)}</span>
                        </button>
                      )}
                      <span className="inline-actions">
                        {editingDebt?.debtId === debt.id ? (
                          <>
                            <Button
                              disabled={savingDebtId === debt.id}
                              onClick={() => void handleSaveDebt()}
                              type="button"
                              variant="ghost"
                            >
                              <Save aria-hidden="true" size={16} />
                              {savingDebtId === debt.id ? 'Saving...' : 'Save'}
                            </Button>
                            <Button onClick={() => setEditingDebt(null)} type="button" variant="ghost">
                              <X aria-hidden="true" size={16} />
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button
                            onClick={() =>
                              setEditingDebt({
                                debtId: debt.id,
                                dueDate: debt.due_date ?? '',
                                interestRate: debt.interest_rate?.toString() ?? '',
                                notes: debt.notes ?? '',
                                originalAmount: String(debt.original_amount),
                                personName: debt.person_name,
                                remainingAmount: String(debt.remaining_amount),
                                status: debt.status,
                                type: debt.type,
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

            <Card>
              <CardHeader>
                <CreditCard aria-hidden="true" size={20} />
                <h2>Payment history</h2>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <p className="empty-state">No payments recorded for the selected debt.</p>
                ) : (
                  <div className="record-list">
                    {payments.map((payment) => (
                      <div className="record-row" key={payment.id}>
                        <span>
                          <strong>{payment.payment_date}</strong>
                          <small>Ledger-linked payment</small>
                        </span>
                        <span>{formatCurrency(payment.amount, selectedWorkspace.currency)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  )
}
