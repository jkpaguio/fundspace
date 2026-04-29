import { Outlet } from 'react-router-dom'
import { useThemePreference } from '../../hooks/useThemePreference'

export function AuthLayout() {
  const { logoSrc } = useThemePreference()

  return (
    <main className="auth-layout">
      <section className="auth-brand-panel" aria-label="FundSpace overview">
        <div className="auth-brand-lockup">
          <img alt="FundSpace logo" className="brand-logo" src={logoSrc} />
          <div>
            <p className="eyebrow">FundSpace</p>
            <strong>Personal, shared, and business money spaces</strong>
          </div>
        </div>
        <div className="auth-brand-copy">
          <h1>Money spaces for real life.</h1>
          <p className="lead">
            Start with personal finance, then grow into shared spaces,
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
