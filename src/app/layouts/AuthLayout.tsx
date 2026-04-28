import { Outlet } from 'react-router-dom'
import { WalletCards } from 'lucide-react'

export function AuthLayout() {
  return (
    <main className="auth-layout">
      <section className="auth-brand-panel" aria-label="FundSpace overview">
        <div className="brand-mark">
          <WalletCards aria-hidden="true" size={24} />
        </div>
        <div>
          <p className="eyebrow">FundSpace</p>
          <h1>Money spaces for real life.</h1>
          <p className="lead">
            Start with personal finance, then grow into shared workspaces,
            budgets, funds, and small business tracking.
          </p>
        </div>
      </section>

      <section className="auth-content">
        <Outlet />
      </section>
    </main>
  )
}
