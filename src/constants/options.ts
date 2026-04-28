import type {
  AccountType,
  CategoryType,
  CurrencyCode,
  TransactionType,
  WorkspaceType,
} from '../types/domain'

export const currencyOptions: CurrencyCode[] = ['PHP', 'USD']

export const workspaceTypeOptions: Array<{ label: string; value: WorkspaceType }> = [
  { label: 'Personal', value: 'personal' },
  { label: 'Family', value: 'family' },
  { label: 'Business', value: 'business' },
  { label: 'Side hustle', value: 'side_hustle' },
  { label: 'Other', value: 'other' },
]

export const accountTypeOptions: Array<{ label: string; value: AccountType }> = [
  { label: 'Cash', value: 'cash' },
  { label: 'Bank', value: 'bank' },
  { label: 'Wallet', value: 'wallet' },
  { label: 'Savings', value: 'savings' },
  { label: 'Investment', value: 'investment' },
  { label: 'Business', value: 'business' },
  { label: 'Other', value: 'other' },
]

export const categoryTypeOptions: Array<{ label: string; value: CategoryType }> = [
  { label: 'Income', value: 'income' },
  { label: 'Expense', value: 'expense' },
  { label: 'Business expense', value: 'business_expense' },
]

export const transactionTypeOptions: Array<{ label: string; value: TransactionType }> = [
  { label: 'Income', value: 'income' },
  { label: 'Expense', value: 'expense' },
]
