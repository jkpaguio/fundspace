import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { NavLink } from 'react-router-dom'
import { ArrowRightLeft, Plus, ReceiptText, Save } from 'lucide-react'
import { EmptyState } from '../../../components/common/EmptyState'
import { PageHeader } from '../../../components/common/PageHeader'
import { SyncBadge } from '../../../components/common/SyncBadge'
import { Button, Input, Modal } from '../../../components/ui'
import { routes } from '../../../app/routes'
import { transactionTypeOptions } from '../../../constants/options'
import { getMemberDisplayName } from '../../../lib/memberDisplay'
import { listAccounts } from '../../accounts/services/accountService'
import { listCategories } from '../../categories/services/categoryService'
import { listWorkspaceProfiles } from '../../workspaces/services/workspaceService'
import { formatCurrency } from '../../../lib/formatCurrency'
import { useWorkspaceOutlet } from '../../../hooks/useWorkspaceOutlet'
import type {
  Account,
  Category,
  Transaction,
  TransactionType,
  WorkspaceProfile,
} from '../../../types/domain'
import {
  createMoneyTransaction,
  createCorrectionTransaction,
  createTransferTransaction,
  listTransactions,
  type TransactionFilter,
} from '../services/transactionService'

const today = new Date().toISOString().slice(0, 10)

export function TransactionsPage() {
  const { selectedWorkspace } = useWorkspaceOutlet()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [profiles, setProfiles] = useState<WorkspaceProfile[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense')
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [transactionDate, setTransactionDate] = useState(today)
  const [notes, setNotes] = useState('')
  const [sourceAccountId, setSourceAccountId] = useState('')
  const [destinationAccountId, setDestinationAccountId] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferDate, setTransferDate] = useState(today)
  const [transferNotes, setTransferNotes] = useState('')
  const [correctionDirection, setCorrectionDirection] = useState<'in' | 'out'>('out')
  const [correctionAmount, setCorrectionAmount] = useState('')
  const [correctionDate, setCorrectionDate] = useState(today)
  const [correctionNotes, setCorrectionNotes] = useState('')
  const [filterType, setFilterType] = useState<TransactionFilter['type']>('all')
  const [filterAccountId, setFilterAccountId] = useState('')
  const [filterSearch, setFilterSearch] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCorrecting, setIsCorrecting] = useState(false)
  const [activeModal, setActiveModal] = useState<'entry' | 'transfer' | null>(null)

  const filteredCategories = useMemo(
    () =>
      categories.filter((category) =>
        transactionType === 'income'
          ? category.type === 'income'
          : category.type === 'expense' || category.type === 'business_expense',
      ),
    [categories, transactionType],
  )

  const loadPageData = useCallback(async () => {
    if (!selectedWorkspace) {
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const filter = {
        accountId: filterAccountId || undefined,
        search: filterSearch || undefined,
        type: filterType,
      }
      const [nextAccounts, nextCategories, nextTransactions, nextProfiles] = await Promise.all([
        listAccounts(selectedWorkspace.id),
        listCategories(selectedWorkspace.id),
        listTransactions(selectedWorkspace.id, filter),
        listWorkspaceProfiles(selectedWorkspace.id),
      ])

      setAccounts(nextAccounts)
      setCategories(nextCategories)
      setProfiles(nextProfiles)
      setTransactions(nextTransactions)

      if (!accountId && nextAccounts[0]) {
        setAccountId(nextAccounts[0].id)
      }

      if (!sourceAccountId && nextAccounts[0]) {
        setSourceAccountId(nextAccounts[0].id)
      }

      if (!destinationAccountId && nextAccounts[1]) {
        setDestinationAccountId(nextAccounts[1].id)
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load transactions.')
    } finally {
      setIsLoading(false)
    }
  }, [
    accountId,
    destinationAccountId,
    filterAccountId,
    filterSearch,
    filterType,
    selectedWorkspace,
    sourceAccountId,
  ])

  const handleCreateMoneyTransaction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedWorkspace) {
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      await createMoneyTransaction({
        accountId,
        amount: Number(amount),
        categoryId: categoryId || null,
        date: transactionDate,
        notes,
        type: transactionType,
        workspaceId: selectedWorkspace.id,
      })
      setAmount('')
      setNotes('')
      setActiveModal(null)
      await loadPageData()
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : 'Unable to create transaction.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateTransfer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedWorkspace) {
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      await createTransferTransaction({
        amount: Number(transferAmount),
        date: transferDate,
        destinationAccountId,
        notes: transferNotes,
        sourceAccountId,
        workspaceId: selectedWorkspace.id,
      })
      setTransferAmount('')
      setTransferNotes('')
      setActiveModal(null)
      await loadPageData()
    } catch (transferError) {
      setError(transferError instanceof Error ? transferError.message : 'Unable to transfer.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateCorrection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedWorkspace || !selectedTransaction) {
      return
    }

    setIsCorrecting(true)
    setError('')

    try {
      await createCorrectionTransaction({
        accountId: selectedTransaction.account_id,
        amount: Number(correctionAmount),
        categoryId: selectedTransaction.category_id,
        date: correctionDate,
        direction: correctionDirection,
        notes:
          correctionNotes
          || `Correction for ${selectedTransaction.notes || selectedTransaction.type.replace('_', ' ')}`,
        workspaceId: selectedWorkspace.id,
      })
      setCorrectionAmount('')
      setCorrectionNotes('')
      await loadPageData()
    } catch (correctionError) {
      setError(
        correctionError instanceof Error
          ? correctionError.message
          : 'Unable to create correction entry.',
      )
    } finally {
      setIsCorrecting(false)
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPageData()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadPageData])

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Ledger"
        heading="Transactions"
        lead="Review the full ledger, filter history, and use manual or corrective entries when Quick Add is not enough."
      />

      {error && <p className="form-error">{error}</p>}

      {!selectedWorkspace ? (
        <EmptyState
          description="Choose a space first so every ledger entry stays tied to the right money area."
          title="Select a space before recording activity"
        />
      ) : accounts.length === 0 && !isLoading ? (
        <EmptyState
          description="Create at least one account before recording income, expenses, or transfers."
          title="Transactions need an account"
        />
      ) : (
        <>
          <section className="success-banner">
            <div>
              <p className="eyebrow">Daily workflow</p>
              <strong>Quick Add is the fastest way to record everyday money movement.</strong>
              <p>
                Use this screen for deeper history, filtering, manual ledger entry, and corrective follow-up when you need more control.
              </p>
            </div>
            <div className="empty-state-actions">
              <Button asChild type="button">
                <NavLink to={routes.add}>Open Quick Add</NavLink>
              </Button>
              <Button onClick={() => setActiveModal('entry')} type="button" variant="secondary">
                <Plus aria-hidden="true" size={18} />
                Manual entry
              </Button>
              <Button onClick={() => setActiveModal('transfer')} type="button" variant="secondary">
                <ArrowRightLeft aria-hidden="true" size={18} />
                Transfer
              </Button>
              <Button asChild type="button" variant="secondary">
                <NavLink to={routes.calendar}>Open Calendar</NavLink>
              </Button>
            </div>
          </section>

          <section className="list-panel">
            <div className="section-heading">
              <h2>Transaction list</h2>
              <span>{isLoading ? 'Loading' : `${transactions.length} shown`}</span>
            </div>

            <div className="filter-bar">
              <select
                className="field-input"
                onChange={(event) => setFilterType(event.target.value as TransactionType | 'all')}
                value={filterType}
              >
                <option value="all">All types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="transfer_out">Transfers out</option>
                <option value="transfer_in">Transfers in</option>
              </select>

              <select
                className="field-input"
                onChange={(event) => setFilterAccountId(event.target.value)}
                value={filterAccountId}
              >
                <option value="">All accounts</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>

              <Input
                onChange={(event) => setFilterSearch(event.target.value)}
                placeholder="Search notes"
                value={filterSearch}
              />
            </div>

            {transactions.length === 0 && !isLoading ? (
              <EmptyState
                description="Try clearing the filters or add your first transaction to start building the ledger history."
                title="No transactions match right now"
              />
            ) : (
              <div className="record-list">
                {transactions.map((transaction) => {
                  const account = accounts.find((item) => item.id === transaction.account_id)
                  const category = categories.find((item) => item.id === transaction.category_id)
                  const creatorName = getMemberDisplayName(profiles, transaction.created_by)

                  return (
                    <button
                      className="record-row"
                      key={transaction.id}
                      onClick={() => setSelectedTransaction(transaction)}
                      type="button"
                    >
                      <span>
                        <strong>{transaction.notes || transaction.type.replace('_', ' ')}</strong>
                        <small>
                          {transaction.transaction_date} / {account?.name ?? 'Account'} /{' '}
                          {category?.name ?? 'No category'} / by {creatorName}
                        </small>
                        <SyncBadge status={(transaction as { sync_status?: string }).sync_status} />
                      </span>
                      <span className={transaction.direction === 'in' ? 'amount-in' : 'amount-out'}>
                        {transaction.direction === 'in' ? '+' : '-'}
                        {formatCurrency(transaction.amount, selectedWorkspace.currency)}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          <Modal
            description="Use the fuller ledger form when Quick Add is not enough."
            isOpen={activeModal === 'entry'}
            onClose={() => setActiveModal(null)}
            title="Manual ledger entry"
          >
            <form className="stack-form" onSubmit={handleCreateMoneyTransaction}>
              <label className="field-group">
                Type
                <select
                  className="field-input"
                  onChange={(event) => setTransactionType(event.target.value as 'income' | 'expense')}
                  value={transactionType}
                >
                  {transactionTypeOptions.map((option) => (
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
                Date
                <Input
                  onChange={(event) => setTransactionDate(event.target.value)}
                  required
                  type="date"
                  value={transactionDate}
                />
              </label>

              <label className="field-group">
                Notes
                <Input
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Salary, groceries, bill payment"
                  value={notes}
                />
              </label>

              <Button disabled={isSubmitting} type="submit">
                <ReceiptText aria-hidden="true" size={18} />
                {isSubmitting ? 'Saving...' : 'Save transaction'}
              </Button>
            </form>
          </Modal>

          <Modal
            description="Record an account-to-account move from the ledger screen."
            isOpen={activeModal === 'transfer'}
            onClose={() => setActiveModal(null)}
            title="Manual transfer entry"
          >
            <form className="stack-form" onSubmit={handleCreateTransfer}>
              <label className="field-group">
                From
                <select
                  className="field-input"
                  onChange={(event) => setSourceAccountId(event.target.value)}
                  required
                  value={sourceAccountId}
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field-group">
                To
                <select
                  className="field-input"
                  onChange={(event) => setDestinationAccountId(event.target.value)}
                  required
                  value={destinationAccountId}
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
                  onChange={(event) => setTransferAmount(event.target.value)}
                  required
                  step="0.01"
                  type="number"
                  value={transferAmount}
                />
              </label>

              <label className="field-group">
                Date
                <Input
                  onChange={(event) => setTransferDate(event.target.value)}
                  required
                  type="date"
                  value={transferDate}
                />
              </label>

              <label className="field-group">
                Notes
                <Input
                  onChange={(event) => setTransferNotes(event.target.value)}
                  placeholder="Move to savings"
                  value={transferNotes}
                />
              </label>

              <Button disabled={isSubmitting || accounts.length < 2} type="submit">
                <ArrowRightLeft aria-hidden="true" size={18} />
                {isSubmitting ? 'Moving...' : 'Transfer money'}
              </Button>
            </form>
          </Modal>

          {selectedTransaction && (
            <section className="detail-panel">
              <div>
                <p className="eyebrow">Transaction detail</p>
                <h2>{selectedTransaction.type.replace('_', ' ')}</h2>
                <p>{selectedTransaction.notes || 'No notes added.'}</p>
                <p className="muted-note">
                  Transactions are preserved for audit history. Use correcting entries or future reversal flows instead of deleting ledger rows.
                </p>
              </div>
              <dl>
                <div>
                  <dt>Amount</dt>
                  <dd>{formatCurrency(selectedTransaction.amount, selectedWorkspace.currency)}</dd>
                </div>
                <div>
                  <dt>Date</dt>
                  <dd>{selectedTransaction.transaction_date}</dd>
                </div>
                <div>
                  <dt>Direction</dt>
                  <dd>{selectedTransaction.direction}</dd>
                </div>
                <div>
                  <dt>Reference group</dt>
                  <dd>{selectedTransaction.reference_group_id ?? 'Single transaction'}</dd>
                </div>
                <div>
                  <dt>Created by</dt>
                  <dd>
                    {getMemberDisplayName(profiles, selectedTransaction.created_by)}
                  </dd>
                </div>
                <div>
                  <dt>Updated at</dt>
                  <dd>{new Date(selectedTransaction.updated_at).toLocaleString()}</dd>
                </div>
              </dl>
              <form className="stack-form correction-form" onSubmit={handleCreateCorrection}>
                <p className="eyebrow">Advanced correction</p>
                <p className="section-description">
                  Use this only when a saved ledger row needs a correcting follow-up instead of a new daily entry.
                </p>
                <label className="field-group">
                  Direction
                  <select
                    className="field-input"
                    onChange={(event) => setCorrectionDirection(event.target.value as 'in' | 'out')}
                    value={correctionDirection}
                  >
                    <option value="out">Decrease balance</option>
                    <option value="in">Increase balance</option>
                  </select>
                </label>
                <label className="field-group">
                  Amount
                  <Input
                    min="0.01"
                    onChange={(event) => setCorrectionAmount(event.target.value)}
                    required
                    step="0.01"
                    type="number"
                    value={correctionAmount}
                  />
                </label>
                <label className="field-group">
                  Date
                  <Input
                    onChange={(event) => setCorrectionDate(event.target.value)}
                    required
                    type="date"
                    value={correctionDate}
                  />
                </label>
                <label className="field-group">
                  Notes
                  <Input
                    onChange={(event) => setCorrectionNotes(event.target.value)}
                    placeholder="Explain the correction"
                    value={correctionNotes}
                  />
                </label>
                <Button disabled={isCorrecting} type="submit">
                  <Save aria-hidden="true" size={18} />
                  {isCorrecting ? 'Saving...' : 'Save correction'}
                </Button>
              </form>
            </section>
          )}
        </>
      )}
    </div>
  )
}
