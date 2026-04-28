export type CurrencyCode = 'PHP' | 'USD'

export type WorkspaceType =
  | 'personal'
  | 'family'
  | 'business'
  | 'side_hustle'
  | 'other'

export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer'

export type MemberStatus = 'invited' | 'active' | 'removed'

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
