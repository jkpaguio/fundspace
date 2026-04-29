import type {
  AccountType,
  BudgetStatus,
  CategoryType,
  CurrencyCode,
  DebtType,
  RecurringFrequency,
  RecurringTransactionType,
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

export const workspaceTypeDescriptions: Record<WorkspaceType, string> = {
  business: 'For operations, sales, costs, and profitability.',
  family: 'For household or shared family money decisions.',
  other: 'For any money area that needs its own records.',
  personal: 'For your own accounts, spending, savings, and goals.',
  side_hustle: 'For small projects that mix personal cash and business activity.',
}

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

export const recurringTransactionTypeOptions: Array<{
  label: string
  value: RecurringTransactionType
}> = [
  { label: 'Income', value: 'income' },
  { label: 'Expense', value: 'expense' },
  { label: 'Transfer', value: 'transfer' },
]

export const recurringFrequencyOptions: Array<{ label: string; value: RecurringFrequency }> = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
]

export const debtTypeOptions: Array<{ label: string; value: DebtType }> = [
  { label: 'Borrowed', value: 'borrowed' },
  { label: 'Lent', value: 'lent' },
  { label: 'Loan', value: 'loan' },
  { label: 'Credit card', value: 'credit_card' },
]

export const monthOptions = [
  { label: 'January', value: 1 },
  { label: 'February', value: 2 },
  { label: 'March', value: 3 },
  { label: 'April', value: 4 },
  { label: 'May', value: 5 },
  { label: 'June', value: 6 },
  { label: 'July', value: 7 },
  { label: 'August', value: 8 },
  { label: 'September', value: 9 },
  { label: 'October', value: 10 },
  { label: 'November', value: 11 },
  { label: 'December', value: 12 },
] as const

export const budgetStatusLabels: Record<BudgetStatus, string> = {
  over: 'Over budget',
  safe: 'On track',
  warning: 'Warning',
}
