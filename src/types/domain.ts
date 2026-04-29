export type CurrencyCode = 'PHP' | 'USD'

export type WorkspaceType =
  | 'personal'
  | 'family'
  | 'business'
  | 'side_hustle'
  | 'other'

export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer'

export type MemberStatus = 'invited' | 'active' | 'removed'

export type RecurringTransactionType = 'income' | 'expense' | 'transfer'

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export type DebtType = 'borrowed' | 'lent' | 'loan' | 'credit_card'

export type DebtStatus = 'active' | 'paid' | 'cancelled'

export type AccountType =
  | 'cash'
  | 'bank'
  | 'wallet'
  | 'savings'
  | 'investment'
  | 'business'
  | 'other'

export type CategoryType = 'income' | 'expense' | 'business_expense'

export type TransactionType =
  | 'income'
  | 'expense'
  | 'transfer_out'
  | 'transfer_in'
  | 'savings_allocation'
  | 'debt_payment'
  | 'adjustment'
  | 'sale_income'
  | 'business_expense'

export type TransactionDirection = 'in' | 'out'

export type BudgetStatus = 'safe' | 'warning' | 'over'

export type Profile = {
  id: string
  full_name: string | null
  avatar_url: string | null
  default_currency: CurrencyCode
  created_at: string
  updated_at: string
}

export type Workspace = {
  id: string
  name: string
  type: WorkspaceType
  owner_id: string
  currency: CurrencyCode
  created_at: string
  updated_at: string
}

export type WorkspaceMember = {
  id: string
  workspace_id: string
  user_id: string
  role: WorkspaceRole
  status: MemberStatus
  invited_by: string | null
  created_at: string
  updated_at: string
}

export type WorkspaceProfile = {
  id: string
  full_name: string | null
}

export type Account = {
  id: string
  workspace_id: string
  name: string
  type: AccountType
  starting_balance: number
  current_balance: number
  currency: CurrencyCode
  is_archived: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export type Category = {
  id: string
  workspace_id: string | null
  name: string
  type: CategoryType
  icon: string | null
  color: string | null
  is_default: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
}

export type Transaction = {
  id: string
  workspace_id: string
  account_id: string
  counterparty_account_id: string | null
  bucket_id: string | null
  debt_id: string | null
  category_id: string | null
  type: TransactionType
  amount: number
  direction: TransactionDirection
  transaction_date: string
  reference_group_id: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type SavingsBucket = {
  id: string
  workspace_id: string
  linked_account_id: string | null
  name: string
  target_amount: number
  current_amount: number
  allocation_percentage: number
  target_date: string | null
  is_archived: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export type Budget = {
  id: string
  workspace_id: string
  category_id: string
  month: number
  year: number
  limit_amount: number
  warning_percentage: number
  created_by: string
  created_at: string
  updated_at: string
}

export type BudgetUsage = {
  budget: Budget
  spent: number
  usagePercentage: number
  remaining: number
  status: BudgetStatus
}

export type ActivityLog = {
  id: string
  workspace_id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string | null
  description: string
  created_at: string
}

export type RecurringTransaction = {
  id: string
  workspace_id: string
  account_id: string
  counterparty_account_id: string | null
  category_id: string | null
  type: RecurringTransactionType
  amount: number
  frequency: RecurringFrequency
  start_date: string
  end_date: string | null
  next_run_date: string
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export type Debt = {
  id: string
  workspace_id: string
  type: DebtType
  person_name: string
  original_amount: number
  remaining_amount: number
  interest_rate: number | null
  due_date: string | null
  status: DebtStatus
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type DebtPayment = {
  id: string
  debt_id: string
  transaction_id: string
  amount: number
  payment_date: string
  notes: string | null
  created_by: string
  created_at: string
}

export type Business = {
  id: string
  workspace_id: string
  name: string
  description: string | null
  capital_amount: number
  logo_url: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type Product = {
  id: string
  business_id: string
  name: string
  description: string | null
  units_produced: number
  selling_price: number
  cost_per_unit: number
  profit_per_unit: number
  profit_margin: number
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export type ProductIngredient = {
  id: string
  product_id: string
  name: string
  quantity: number
  unit: string
  total_cost: number
  created_at: string
  updated_at: string
}

export type Sale = {
  id: string
  business_id: string
  product_id: string
  transaction_id: string
  quantity: number
  selling_price: number
  cost_per_unit: number
  revenue: number
  cogs: number
  gross_profit: number
  sale_date: string
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type BusinessExpense = {
  id: string
  business_id: string
  transaction_id: string
  category_id: string | null
  amount: number
  expense_date: string
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type FinancialInsight = {
  title: string
  summary: string
  priority: 'high' | 'medium' | 'low'
}

export type SmartRecommendation = {
  action: string
  reason: string
  impact: 'high' | 'medium' | 'low'
}

export type FinancialInsightsResponse = {
  insights: FinancialInsight[]
  recommendations: SmartRecommendation[]
}
