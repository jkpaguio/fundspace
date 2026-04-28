import type { CurrencyCode } from '../types/domain'

export function formatCurrency(
  amount: number,
  currency: CurrencyCode = 'PHP',
) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}
