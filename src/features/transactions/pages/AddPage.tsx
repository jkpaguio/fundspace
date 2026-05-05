import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { NavLink } from 'react-router-dom'
import {
  ArrowRightLeft,
  BriefcaseBusiness,
  CheckCircle2,
  PiggyBank,
  Plus,
  ReceiptText,
  ShieldAlert,
  Store,
  Tags,
  WalletCards,
} from 'lucide-react'
import { EmptyState } from '../../../components/common/EmptyState'
import { PageHeader } from '../../../components/common/PageHeader'
import { Button, Input, Modal } from '../../../components/ui'
import { routes } from '../../../app/routes'
import { formatCurrency } from '../../../lib/formatCurrency'
import { useWorkspaceOutlet } from '../../../hooks/useWorkspaceOutlet'
import { listAccounts } from '../../accounts/services/accountService'
import { listCategories } from '../../categories/services/categoryService'
import {
  createBusinessExpense,
  createSale,
  listBusinesses,
  listProducts,
} from '../../business/services/businessService'
import type {
  Account,
  Business,
  Category,
  Product,
  Transaction,
} from '../../../types/domain'
import {
  createMoneyTransaction,
  createTransferTransaction,
  listTransactions,
} from '../services/transactionService'

const today = new Date().toISOString().slice(0, 10)

type QuickAddAction = 'expense' | 'income' | 'transfer' | 'sale' | 'business_expense'

type SuccessState = {
  action: QuickAddAction
  amount: number
  title: string
}

const householdActionItems: Array<{
  description: string
  icon: typeof ReceiptText
  value: QuickAddAction
  label: string
}> = [
  {
    description: 'Record spending from one account.',
    icon: ReceiptText,
    label: 'Expense',
    value: 'expense',
  },
  {
    description: 'Record money coming in.',
    icon: Plus,
    label: 'Income',
    value: 'income',
  },
  {
    description: 'Move money between your accounts.',
    icon: ArrowRightLeft,
    label: 'Transfer',
    value: 'transfer',
  },
]

const businessActionItems: Array<{
  description: string
  icon: typeof ReceiptText
  value: QuickAddAction
  label: string
}> = [
  ...householdActionItems,
  {
    description: 'Capture a sale tied to a product.',
    icon: BriefcaseBusiness,
    label: 'Sale',
    value: 'sale',
  },
  {
    description: 'Capture an operating expense.',
    icon: Store,
    label: 'Business expense',
    value: 'business_expense',
  },
]

const setupItems = [
  {
    description: 'Add the bank, wallet, or cash accounts you use every day.',
    icon: WalletCards,
    label: 'Accounts',
    to: routes.accounts,
  },
  {
    description: 'Keep spending and income organized with clear categories.',
    icon: Tags,
    label: 'Categories',
    to: routes.categories,
  },
  {
    description: 'Set targets and reserves for upcoming needs.',
    icon: PiggyBank,
    label: 'Savings',
    to: routes.savings,
  },
  {
    description: 'Watch category limits before spending drifts too far.',
    icon: ShieldAlert,
    label: 'Budgets',
    to: routes.budgets,
  },
] as const

export function AddPage() {
  const { selectedWorkspace } = useWorkspaceOutlet()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [selectedAction, setSelectedAction] = useState<QuickAddAction>('expense')
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [entryDate, setEntryDate] = useState(today)
  const [notes, setNotes] = useState('')
  const [sourceAccountId, setSourceAccountId] = useState('')
  const [destinationAccountId, setDestinationAccountId] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferDate, setTransferDate] = useState(today)
  const [transferNotes, setTransferNotes] = useState('')
  const [businessId, setBusinessId] = useState('')
  const [productId, setProductId] = useState('')
  const [saleAccountId, setSaleAccountId] = useState('')
  const [saleQuantity, setSaleQuantity] = useState('1')
  const [salePrice, setSalePrice] = useState('0')
  const [saleDate, setSaleDate] = useState(today)
  const [saleNotes, setSaleNotes] = useState('')
  const [expenseAccountId, setExpenseAccountId] = useState('')
  const [businessCategoryId, setBusinessCategoryId] = useState('')
  const [businessExpenseAmount, setBusinessExpenseAmount] = useState('')
  const [businessExpenseDate, setBusinessExpenseDate] = useState(today)
  const [businessExpenseNotes, setBusinessExpenseNotes] = useState('')
  const [successState, setSuccessState] = useState<SuccessState | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeModal, setActiveModal] = useState<QuickAddAction | null>(null)

  const isBusinessWorkspace =
    selectedWorkspace?.type === 'business' || selectedWorkspace?.type === 'side_hustle'
  const actionItems = isBusinessWorkspace ? businessActionItems : householdActionItems

  const filteredCategories = useMemo(
    () =>
      categories.filter((category) =>
        selectedAction === 'income'
          ? category.type === 'income'
          : category.type === 'expense' || category.type === 'business_expense',
      ),
    [categories, selectedAction],
  )

  const businessExpenseCategories = useMemo(
    () =>
      categories.filter(
        (category) => category.type === 'business_expense' || category.type === 'expense',
      ),
    [categories],
  )

  const loadQuickAddData = useCallback(async () => {
    if (!selectedWorkspace) {
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const [nextAccounts, nextCategories, nextTransactions, nextBusinesses] = await Promise.all([
        listAccounts(selectedWorkspace.id),
        listCategories(selectedWorkspace.id),
        listTransactions(selectedWorkspace.id),
        isBusinessWorkspace ? listBusinesses(selectedWorkspace.id) : Promise.resolve([]),
      ])

      setAccounts(nextAccounts)
      setCategories(nextCategories)
      setRecentTransactions(nextTransactions.slice(0, 5))
      setBusinesses(nextBusinesses)

      if (!accountId && nextAccounts[0]) {
        setAccountId(nextAccounts[0].id)
      }

      if (!sourceAccountId && nextAccounts[0]) {
        setSourceAccountId(nextAccounts[0].id)
      }

      if (!destinationAccountId && nextAccounts[1]) {
        setDestinationAccountId(nextAccounts[1].id)
      }

      if (!saleAccountId && nextAccounts[0]) {
        setSaleAccountId(nextAccounts[0].id)
      }

      if (!expenseAccountId && nextAccounts[0]) {
        setExpenseAccountId(nextAccounts[0].id)
      }

      if (!businessCategoryId) {
        const defaultExpenseCategory = nextCategories.find(
          (category) => category.type === 'business_expense' || category.type === 'expense',
        )

        if (defaultExpenseCategory) {
          setBusinessCategoryId(defaultExpenseCategory.id)
        }
      }

      if (isBusinessWorkspace) {
        const nextBusinessId = nextBusinesses.find((item) => item.id === businessId)?.id ?? nextBusinesses[0]?.id ?? ''
        setBusinessId(nextBusinessId)

        if (nextBusinessId) {
          const nextProducts = await listProducts(nextBusinessId)
          setProducts(nextProducts)

          const nextProduct = nextProducts.find((item) => item.id === productId) ?? nextProducts[0] ?? null
          setProductId(nextProduct?.id ?? '')

          if (nextProduct && (salePrice === '0' || salePrice.length === 0)) {
            setSalePrice(String(nextProduct.selling_price))
          }
        } else {
          setProducts([])
          setProductId('')
        }
      } else {
        setBusinesses([])
        setProducts([])
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load quick add.')
    } finally {
      setIsLoading(false)
    }
  }, [
    accountId,
    businessCategoryId,
    businessId,
    destinationAccountId,
    expenseAccountId,
    isBusinessWorkspace,
    productId,
    saleAccountId,
    salePrice,
    selectedWorkspace,
    sourceAccountId,
  ])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadQuickAddData()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadQuickAddData])

  const selectedProduct = products.find((product) => product.id === productId) ?? null

  const resetMoneyForm = () => {
    setAmount('')
    setNotes('')
  }

  const resetTransferForm = () => {
    setTransferAmount('')
    setTransferNotes('')
  }

  const resetSaleForm = () => {
    setSaleQuantity('1')
    setSaleNotes('')
    setSalePrice(selectedProduct ? String(selectedProduct.selling_price) : '0')
  }

  const resetBusinessExpenseForm = () => {
    setBusinessExpenseAmount('')
    setBusinessExpenseNotes('')
  }

  const handleCreateMoneyTransaction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedWorkspace) {
      return
    }

    setIsSubmitting(true)
    setError('')
    setSuccessState(null)

    try {
      await createMoneyTransaction({
        accountId,
        amount: Number(amount),
        categoryId: categoryId || null,
        date: entryDate,
        notes,
        type: selectedAction === 'income' ? 'income' : 'expense',
        workspaceId: selectedWorkspace.id,
      })

      setSuccessState({
        action: selectedAction,
        amount: Number(amount),
        title: selectedAction === 'income' ? 'Income saved' : 'Expense saved',
      })
      resetMoneyForm()
      setActiveModal(null)
      await loadQuickAddData()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to save entry.')
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
    setSuccessState(null)

    try {
      await createTransferTransaction({
        amount: Number(transferAmount),
        date: transferDate,
        destinationAccountId,
        notes: transferNotes,
        sourceAccountId,
        workspaceId: selectedWorkspace.id,
      })

      setSuccessState({
        action: 'transfer',
        amount: Number(transferAmount),
        title: 'Transfer saved',
      })
      resetTransferForm()
      setActiveModal(null)
      await loadQuickAddData()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to transfer money.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateSale = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!businessId || !productId) {
      return
    }

    setIsSubmitting(true)
    setError('')
    setSuccessState(null)

    try {
      await createSale({
        accountId: saleAccountId,
        businessId,
        date: saleDate,
        notes: saleNotes,
        productId,
        quantity: Number(saleQuantity),
        sellingPrice: Number(salePrice),
      })

      setSuccessState({
        action: 'sale',
        amount: Number(salePrice) * Number(saleQuantity),
        title: 'Sale saved',
      })
      resetSaleForm()
      setActiveModal(null)
      await loadQuickAddData()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to record sale.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateBusinessExpense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!businessId) {
      return
    }

    setIsSubmitting(true)
    setError('')
    setSuccessState(null)

    try {
      await createBusinessExpense({
        accountId: expenseAccountId,
        amount: Number(businessExpenseAmount),
        businessId,
        categoryId: businessCategoryId || null,
        date: businessExpenseDate,
        notes: businessExpenseNotes,
      })

      setSuccessState({
        action: 'business_expense',
        amount: Number(businessExpenseAmount),
        title: 'Business expense saved',
      })
      resetBusinessExpenseForm()
      setActiveModal(null)
      await loadQuickAddData()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to record expense.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const needsAccounts = accounts.length === 0 && !isLoading
  const needsBusinessSetup = isBusinessWorkspace && businesses.length === 0

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Quick add"
        heading="Add money movement in a few taps"
        lead="Choose the entry type first, then only the fields you need appear."
      />

      {error && <p className="form-error">{error}</p>}

      {!selectedWorkspace ? (
        <EmptyState
          description="Choose a space first so every entry stays tied to the right money area."
          title="Select a space before using Quick Add"
        />
      ) : needsAccounts ? (
        <EmptyState
          action={
            <Button asChild>
              <NavLink to={routes.accounts}>Create your first account</NavLink>
            </Button>
          }
          description="Quick Add needs at least one account before it can record income, expenses, or transfers."
          title="Start by adding an account"
        />
      ) : (
        <>
          <section className="section-surface section-surface-hero">
            <div className="section-heading section-heading-stack">
              <div>
                <p className="eyebrow">Daily capture</p>
                <h2>Start with the kind of entry you need</h2>
                <p className="section-description">
                  Quick Add keeps daily capture light, while full Transactions stays available for deeper review.
                </p>
              </div>
              <div className="dashboard-variant-tags">
                <span className="badge">{selectedWorkspace.name}</span>
                <span className="badge">{selectedWorkspace.currency}</span>
                <span className="badge">{recentTransactions.length} recent entries</span>
              </div>
            </div>
          </section>

          <section className="add-action-grid">
            {actionItems.map((item) => {
              const Icon = item.icon
              const isSelected = selectedAction === item.value

              return (
                <button
                  className={`add-action-card ${isSelected ? 'add-action-card-selected' : ''}`}
                  key={item.value}
                  onClick={() => {
                    setSelectedAction(item.value)
                    setSuccessState(null)
                    setActiveModal(item.value)
                  }}
                  type="button"
                >
                  <Icon aria-hidden="true" size={20} />
                  <div>
                    <strong>{item.label}</strong>
                    <p>{item.description}</p>
                  </div>
                </button>
              )
            })}
          </section>

          {successState && selectedWorkspace && (
            <section className="success-banner">
              <div>
                <p className="eyebrow">Saved</p>
                <strong>
                  <CheckCircle2 aria-hidden="true" size={16} />
                  {successState.title}
                </strong>
                <p>
                  {formatCurrency(successState.amount, selectedWorkspace.currency)} was added to{' '}
                  {selectedWorkspace.name}.
                </p>
              </div>
              <div className="empty-state-actions">
                <Button
                  onClick={() => {
                    setSelectedAction(successState.action)
                    setActiveModal(successState.action)
                    setSuccessState(null)
                  }}
                  type="button"
                >
                  Add another
                </Button>
                <Button asChild type="button" variant="secondary">
                  <NavLink to={routes.transactions}>View transactions</NavLink>
                </Button>
              </div>
            </section>
          )}

          <section className="content-grid">
            <section className="list-panel">
              <div className="section-heading">
                <h2>Why this works</h2>
                <span>Quick Add first</span>
              </div>

              <div className="section-note-list">
                <div className="section-note-item">
                  <strong>Action first</strong>
                  <p>Choose expense, income, transfer, or business entry before filling anything else.</p>
                </div>
                <div className="section-note-item">
                  <strong>Only the needed fields</strong>
                  <p>FundSpace hides the extra ledger controls until you move into the full Transactions or Business screens.</p>
                </div>
                <div className="section-note-item">
                  <strong>Ledger stays accurate</strong>
                  <p>Quick Add still uses the same transaction and business services as the deeper modules.</p>
                </div>
              </div>
            </section>
          </section>

          <Modal
            description="Record a simple daily income or expense entry."
            isOpen={activeModal === 'expense' || activeModal === 'income'}
            onClose={() => setActiveModal(null)}
            title={selectedAction === 'income' ? 'Record income' : 'Record expense'}
          >
            <form className="stack-form" onSubmit={handleCreateMoneyTransaction}>
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
                  onChange={(event) => setEntryDate(event.target.value)}
                  required
                  type="date"
                  value={entryDate}
                />
              </label>

              <label className="field-group">
                Notes
                <Input
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder={selectedAction === 'income' ? 'Salary, cash in, refund' : 'Groceries, fare, bill payment'}
                  value={notes}
                />
              </label>

              <Button disabled={isSubmitting} type="submit">
                <ReceiptText aria-hidden="true" size={18} />
                {isSubmitting ? 'Saving...' : selectedAction === 'income' ? 'Save income' : 'Save expense'}
              </Button>
            </form>
          </Modal>

          <Modal
            description="Move money between two accounts in this space."
            isOpen={activeModal === 'transfer'}
            onClose={() => setActiveModal(null)}
            title="Transfer money"
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

          <Modal
            description="Capture a sale tied to a business product."
            isOpen={activeModal === 'sale'}
            onClose={() => setActiveModal(null)}
            title="Record sale"
          >
            {needsBusinessSetup ? (
              <EmptyState
                action={
                  <Button asChild>
                    <NavLink to={routes.business}>Open business tools</NavLink>
                  </Button>
                }
                description="Create a business profile and at least one product before using sale Quick Add."
                title="Sale Quick Add needs business setup"
              />
            ) : (
              <form className="stack-form" onSubmit={handleCreateSale}>
                <label className="field-group">
                  Business
                  <select
                    className="field-input"
                    onChange={async (event) => {
                      const nextBusinessId = event.target.value
                      setBusinessId(nextBusinessId)
                      setProductId('')
                      setSalePrice('0')

                      const nextProducts = nextBusinessId ? await listProducts(nextBusinessId) : []
                      setProducts(nextProducts)

                      const firstProduct = nextProducts[0]
                      if (firstProduct) {
                        setProductId(firstProduct.id)
                        setSalePrice(String(firstProduct.selling_price))
                      }
                    }}
                    value={businessId}
                  >
                    {businesses.map((business) => (
                      <option key={business.id} value={business.id}>
                        {business.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field-group">
                  Account
                  <select
                    className="field-input"
                    onChange={(event) => setSaleAccountId(event.target.value)}
                    required
                    value={saleAccountId}
                  >
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field-group">
                  Product
                  <select
                    className="field-input"
                    onChange={(event) => {
                      const nextProduct = products.find((product) => product.id === event.target.value) ?? null
                      setProductId(event.target.value)
                      setSalePrice(nextProduct ? String(nextProduct.selling_price) : '0')
                    }}
                    required
                    value={productId}
                  >
                    <option value="">Select a product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field-group">
                  Quantity
                  <Input
                    min="0.01"
                    onChange={(event) => setSaleQuantity(event.target.value)}
                    required
                    step="0.01"
                    type="number"
                    value={saleQuantity}
                  />
                </label>

                <label className="field-group">
                  Selling price
                  <Input
                    min="0.01"
                    onChange={(event) => setSalePrice(event.target.value)}
                    required
                    step="0.01"
                    type="number"
                    value={salePrice}
                  />
                </label>

                <label className="field-group">
                  Sale date
                  <Input
                    onChange={(event) => setSaleDate(event.target.value)}
                    required
                    type="date"
                    value={saleDate}
                  />
                </label>

                <label className="field-group">
                  Notes
                  <Input
                    onChange={(event) => setSaleNotes(event.target.value)}
                    placeholder="Walk-in sale, online order"
                    value={saleNotes}
                  />
                </label>

                <Button disabled={isSubmitting || !productId} type="submit">
                  <BriefcaseBusiness aria-hidden="true" size={18} />
                  {isSubmitting ? 'Saving...' : 'Save sale'}
                </Button>
              </form>
            )}
          </Modal>

          <Modal
            description="Capture an operating expense for the selected business."
            isOpen={activeModal === 'business_expense'}
            onClose={() => setActiveModal(null)}
            title="Record business expense"
          >
            {needsBusinessSetup ? (
              <EmptyState
                action={
                  <Button asChild>
                    <NavLink to={routes.business}>Open business tools</NavLink>
                  </Button>
                }
                description="Create a business profile before using business expense Quick Add."
                title="Business expense Quick Add needs setup"
              />
            ) : (
              <form className="stack-form" onSubmit={handleCreateBusinessExpense}>
                <label className="field-group">
                  Business
                  <select
                    className="field-input"
                    onChange={(event) => setBusinessId(event.target.value)}
                    required
                    value={businessId}
                  >
                    {businesses.map((business) => (
                      <option key={business.id} value={business.id}>
                        {business.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field-group">
                  Account
                  <select
                    className="field-input"
                    onChange={(event) => setExpenseAccountId(event.target.value)}
                    required
                    value={expenseAccountId}
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
                    onChange={(event) => setBusinessCategoryId(event.target.value)}
                    value={businessCategoryId}
                  >
                    {businessExpenseCategories.map((category) => (
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
                    onChange={(event) => setBusinessExpenseAmount(event.target.value)}
                    required
                    step="0.01"
                    type="number"
                    value={businessExpenseAmount}
                  />
                </label>

                <label className="field-group">
                  Date
                  <Input
                    onChange={(event) => setBusinessExpenseDate(event.target.value)}
                    required
                    type="date"
                    value={businessExpenseDate}
                  />
                </label>

                <label className="field-group">
                  Notes
                  <Input
                    onChange={(event) => setBusinessExpenseNotes(event.target.value)}
                    placeholder="Packaging, delivery, supplies"
                    value={businessExpenseNotes}
                  />
                </label>

                <Button disabled={isSubmitting} type="submit">
                  <Store aria-hidden="true" size={18} />
                  {isSubmitting ? 'Saving...' : 'Save business expense'}
                </Button>
              </form>
            )}
          </Modal>

          <section className="content-grid">
            <section className="list-panel">
              <div className="section-heading">
                <h2>Recent money entries</h2>
                <span>{isLoading ? 'Loading' : `${recentTransactions.length} latest`}</span>
              </div>

              {recentTransactions.length === 0 && !isLoading ? (
                <EmptyState
                  description="Your latest income, expenses, transfers, and business-linked transactions will appear here after the first save."
                  title="No recent entries yet"
                />
              ) : (
                <div className="record-list">
                  {recentTransactions.map((transaction) => (
                    <div className="record-row" key={transaction.id}>
                      <span>
                        <strong>{transaction.notes || transaction.type.replace('_', ' ')}</strong>
                        <small>{transaction.transaction_date}</small>
                      </span>
                      {selectedWorkspace && (
                        <span className={transaction.direction === 'in' ? 'amount-in' : 'amount-out'}>
                          {transaction.direction === 'in' ? '+' : '-'}
                          {formatCurrency(transaction.amount, selectedWorkspace.currency)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="list-panel">
              <div className="section-heading">
                <h2>{isBusinessWorkspace ? 'Helpful setup shortcuts' : 'Helpful planning shortcuts'}</h2>
                <span>{isBusinessWorkspace ? 'Business-ready' : 'Daily-ready'}</span>
              </div>

              <div className="more-grid">
                {setupItems
                  .filter((item) =>
                    isBusinessWorkspace
                      ? item.to !== routes.savings && item.to !== routes.budgets
                      : true,
                  )
                  .map((item) => {
                    const Icon = item.icon

                    return (
                      <NavLink className="more-nav-card" key={item.to} to={item.to}>
                        <Icon aria-hidden="true" size={20} />
                        <div>
                          <strong>{item.label}</strong>
                          <p>{item.description}</p>
                        </div>
                      </NavLink>
                    )
                  })}

                {isBusinessWorkspace && (
                  <NavLink className="more-nav-card" to={routes.business}>
                    <BriefcaseBusiness aria-hidden="true" size={20} />
                    <div>
                      <strong>Business tools</strong>
                      <p>Open the full costing, sales, and operating workflows when you need deeper work.</p>
                    </div>
                  </NavLink>
                )}

                <NavLink className="more-nav-card" to={routes.transactions}>
                  <ReceiptText aria-hidden="true" size={20} />
                  <div>
                    <strong>Full transactions</strong>
                    <p>Open filters, audit detail, and correction entries after the quick daily capture is done.</p>
                  </div>
                </NavLink>
              </div>
            </section>
          </section>
        </>
      )}
    </div>
  )
}
