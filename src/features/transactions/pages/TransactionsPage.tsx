import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowRightLeft, Plus, ReceiptText } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, Input } from '../../../components/ui'
import { transactionTypeOptions } from '../../../constants/options'
import { listAccounts } from '../../accounts/services/accountService'
import { listCategories } from '../../categories/services/categoryService'
import { formatCurrency } from '../../../lib/formatCurrency'
import { useWorkspaceOutlet } from '../../../hooks/useWorkspaceOutlet'
import type { Account, Category, Transaction, TransactionType } from '../../../types/domain'
import {
  createMoneyTransaction,
  createTransferTransaction,
  listTransactions,
  type TransactionFilter,
} from '../services/transactionService'

const today = new Date().toISOString().slice(0, 10)

export function TransactionsPage() {
  const { selectedWorkspace } = useWorkspaceOutlet()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
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
  const [filterType, setFilterType] = useState<TransactionFilter['type']>('all')
  const [filterAccountId, setFilterAccountId] = useState('')
  const [filterSearch, setFilterSearch] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      const [nextAccounts, nextCategories, nextTransactions] = await Promise.all([
        listAccounts(selectedWorkspace.id),
        listCategories(selectedWorkspace.id),
        listTransactions(selectedWorkspace.id, filter),
      ])

      setAccounts(nextAccounts)
      setCategories(nextCategories)
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
      await loadPageData()
    } catch (transferError) {
      setError(transferError instanceof Error ? transferError.message : 'Unable to transfer.')
    } finally {
      setIsSubmitting(false)
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
      <header className="page-header">
        <div>
          <p className="eyebrow">Ledger</p>
          <h1>Transactions</h1>
          <p className="lead">Record income, expenses, and account transfers with auditable ledger rows.</p>
        </div>
      </header>

      {error && <p className="form-error">{error}</p>}

      {!selectedWorkspace ? (
        <p className="empty-state">Create a workspace before recording transactions.</p>
      ) : accounts.length === 0 && !isLoading ? (
        <p className="empty-state">Add at least one account before recording income or expenses.</p>
      ) : (
        <>
          <section className="content-grid">
            <Card>
              <CardHeader>
                <Plus aria-hidden="true" size={20} />
                <h2>Income or expense</h2>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <ArrowRightLeft aria-hidden="true" size={20} />
                <h2>Transfer</h2>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
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
              <p className="empty-state">No transactions match the current filters.</p>
            ) : (
              <div className="record-list">
                {transactions.map((transaction) => {
                  const account = accounts.find((item) => item.id === transaction.account_id)
                  const category = categories.find((item) => item.id === transaction.category_id)

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
                          {category?.name ?? 'No category'}
                        </small>
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

          {selectedTransaction && (
            <section className="detail-panel">
              <div>
                <p className="eyebrow">Transaction detail</p>
                <h2>{selectedTransaction.type.replace('_', ' ')}</h2>
                <p>{selectedTransaction.notes || 'No notes added.'}</p>
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
              </dl>
            </section>
          )}
        </>
      )}
    </div>
  )
}
