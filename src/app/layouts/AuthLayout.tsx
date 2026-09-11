import { Link, Outlet, useLocation } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, BriefcaseBusiness, Check, CloudOff, PiggyBank, Users, WalletCards } from 'lucide-react'
import { useThemePreference } from '../../hooks/useThemePreference'
import { routes } from '../routes'
import './auth-3d.css'

export function AuthLayout() {
  const { logoSrc } = useThemePreference()
  const { pathname } = useLocation()
  const isRegister = pathname === routes.register
  const isRecovery = pathname === routes.forgotPassword

  if (pathname === routes.login || isRegister || isRecovery) {
    return (
      <main className="auth-3d">
        <section className="auth-3d-story" aria-label="Welcome to FundSpace">
          <Link className="auth-3d-brand" to={routes.home}>
            <img src="/fundspace-icon.svg" alt="" /> FundSpace<span>.</span>
          </Link>
          <div className="auth-3d-intro">
            <p className="auth-3d-eyebrow">YOUR MONEY. YOUR SPACE.</p>
            <h1>{isRegister ? <>Small steps.<br />Brighter <em>beginnings.</em></> : <>Your space.<br />A clearer <em>tomorrow.</em></>}</h1>
            <p>{isRegister ? 'Make room for your goals, your everyday, and everything you’re building.' : 'Pick up where you left off. Your everyday money and bigger plans belong together.'}</p>
          </div>
          <div className="auth-3d-scene" aria-hidden="true">
            <div className="auth-3d-orbit" />
            <div className="auth-3d-wallet">
              <div className="auth-3d-wallet-top"><WalletCards size={22} /><span>MY MONEY SPACE</span><ArrowUpRight size={18} /></div>
              <span className="auth-3d-wallet-label">A little more clarity.</span>
              <strong>All in one place.</strong>
              <div className="auth-3d-wallet-bars"><i /><i /><i /><i /><i /><i /><i /></div>
              <div className="auth-3d-wallet-bottom"><span>Track. Plan. Grow.</span><span>FundSpace.</span></div>
            </div>
            <div className="auth-3d-goal"><span><PiggyBank size={24} /></span><div><strong>Big plans start small.</strong><small>A space for every goal</small></div><div className="auth-3d-goal-line"><i /></div></div>
            <div className="auth-3d-offline"><span><Check size={15} /></span>Offline. Still on track.</div>
            <div className="auth-3d-coin">₱</div>
          </div>
          <div className="auth-3d-spaces"><span><WalletCards size={15} /> Personal</span><span><Users size={15} /> Shared</span><span><BriefcaseBusiness size={15} /> Business</span></div>
        </section>
        <section className="auth-3d-content" aria-label={isRecovery ? 'Reset your password' : isRegister ? 'Create your account' : 'Sign in to your account'}>
          <div className="auth-3d-topline"><Link to={routes.home}><ArrowLeft size={15} /> Back to home</Link><span>{isRecovery ? 'Let’s get you back in' : isRegister ? 'A fresh start' : 'Good to see you'}</span></div>
          <div className="auth-3d-form-stage"><Outlet /></div>
          <p className="auth-3d-footnote"><CloudOff size={15} /> A calmer money routine. Online or off.</p>
        </section>
      </main>
    )
  }

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
