import type { Account, Transaction } from '../types/domain'

export function calculateTotalBalance(accounts: Account[]) {
  return accounts.reduce((total, account) => total + account.current_balance, 0)
}

export function calculateMonthlyIncome(transactions: Transaction[]) {
  return transactions
    .filter((transaction) => transaction.direction === 'in')
    .reduce((total, transaction) => total + transaction.amount, 0)
}

export function calculateMonthlyExpenses(transactions: Transaction[]) {
  return transactions
    .filter((transaction) => transaction.direction === 'out')
    .reduce((total, transaction) => total + transaction.amount, 0)
}

export function calculateNetSavings(income: number, expenses: number) {
  return income - expenses
}
