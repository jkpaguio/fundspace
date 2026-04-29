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

export function calculateBudgetUsage(spent: number, budgetLimit: number) {
  if (budgetLimit <= 0) {
    return 0
  }

  return (spent / budgetLimit) * 100
}

export function calculateGoalProgress(currentAmount: number, targetAmount: number) {
  if (targetAmount <= 0) {
    return 0
  }

  return (currentAmount / targetAmount) * 100
}

export function calculateTotalCost(ingredients: Array<{ total_cost: number }>) {
  return ingredients.reduce((total, ingredient) => total + ingredient.total_cost, 0)
}

export function calculateCostPerUnit(totalCost: number, unitsProduced: number) {
  if (unitsProduced <= 0) {
    return 0
  }

  return totalCost / unitsProduced
}

export function calculateProfitPerUnit(sellingPrice: number, costPerUnit: number) {
  return sellingPrice - costPerUnit
}

export function calculateProfitMargin(profitPerUnit: number, sellingPrice: number) {
  if (sellingPrice <= 0) {
    return 0
  }

  return (profitPerUnit / sellingPrice) * 100
}

export function calculateRevenue(sellingPrice: number, quantity: number) {
  return sellingPrice * quantity
}

export function calculateCOGS(costPerUnit: number, quantity: number) {
  return costPerUnit * quantity
}

export function calculateGrossProfit(revenue: number, cogs: number) {
  return revenue - cogs
}

export function calculateNetProfit(grossProfit: number, expenses: number) {
  return grossProfit - expenses
}

export function calculateROI(netProfit: number, capital: number) {
  if (capital <= 0) {
    return 0
  }

  return (netProfit / capital) * 100
}

export function calculateRemainingDebt(originalAmount: number, totalPayments: number) {
  return Math.max(originalAmount - totalPayments, 0)
}
