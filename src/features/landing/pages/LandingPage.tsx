import { Navigate } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CloudOff,
  Download,
  PiggyBank,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Users,
  WalletCards,
} from 'lucide-react'
import { Button } from '../../../components/ui'
import { routes } from '../../../app/routes'
import { useAuthSession } from '../../../hooks/useAuthSession'
import { isInstalledAppRuntime } from '../../../lib/runtime'

const landingHighlights = [
  {
    icon: CloudOff,
    title: 'Works offline',
    copy: 'Keep recording daily money movement even when the connection drops.',
  },
  {
    icon: WalletCards,
    title: 'One focused ledger',
    copy: 'Track accounts, transactions, budgets, savings, debts, and reports together.',
  },
  {
    icon: BriefcaseBusiness,
    title: 'Business ready',
    copy: 'Handle product costing, sales, business expenses, and profit snapshots.',
  },
]

const landingModules = [
  'Accounts and categories',
  'Quick income and expense capture',
  'Transfers and corrections',
  'Budgets and warnings',
  'Savings buckets',
  'Debts and payments',
  'Recurring templates',
  'Business costing and sales',
  'Calendar and reports',
]

const workflowSteps = [
  {
    icon: CloudOff,
    title: 'Capture offline',
    copy: 'Add records while commuting, travelling, or working through patchy signal.',
  },
  {
    icon: RefreshCw,
    title: 'Sync when online',
    copy: 'Queued changes replay to Supabase when the device reconnects.',
  },
  {
    icon: ShieldCheck,
    title: 'Review attention items',
    copy: 'Sync Center keeps failed changes and server-wins conflicts visible.',
  },
]

const apkDownloadHref = '/apk/fundspace-v1.0.0.apk'

export function LandingPage() {
  const { isLoading, session } = useAuthSession()

  if (isInstalledAppRuntime()) {
    if (isLoading) {
      return <div className="page-state">Opening FundSpace...</div>
    }

    return <Navigate replace to={session ? routes.dashboard : routes.login} />
  }

  return (
    <main className="landing-page">
      <section className="landing-hero">
        <nav className="landing-nav" aria-label="Landing navigation">
          <a className="landing-brand" href={routes.home}>
            <img alt="FundSpace" src="/fundspace-icon.svg" />
            <span>FundSpace</span>
          </a>
          <span className="landing-nav-actions">
            <Button asChild type="button" variant="ghost">
              <a download href={apkDownloadHref}>
                Download APK
              </a>
            </Button>
            <Button asChild type="button">
              <a download href={apkDownloadHref}>
                Install Android app
              </a>
            </Button>
          </span>
        </nav>

        <div className="landing-hero-copy">
          <p className="eyebrow">Offline-first finance workspace</p>
          <h1>FundSpace</h1>
          <p className="lead">
            Keep personal, family, and business money organized in one installable app that
            keeps working when the internet gets shaky.
          </p>
          <div className="landing-action-row">
            <Button asChild type="button">
              <a download href={apkDownloadHref}>
                <ArrowRight aria-hidden="true" size={18} />
                Download APK
              </a>
            </Button>
            <Button asChild type="button" variant="secondary">
              <a download href={apkDownloadHref}>
                <Download aria-hidden="true" size={18} />
                Install Android app
              </a>
            </Button>
          </div>
          <dl className="landing-metrics" aria-label="FundSpace coverage">
            <div>
              <dt>Offline</dt>
              <dd>first</dd>
            </div>
            <div>
              <dt>Personal</dt>
              <dd>Family</dd>
            </div>
            <div>
              <dt>Business</dt>
              <dd>ready</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="landing-feature-band" aria-label="FundSpace features">
        {landingHighlights.map((item) => {
          const Icon = item.icon

          return (
            <article className="landing-feature" key={item.title}>
              <Icon aria-hidden="true" size={22} />
              <div>
                <h2>{item.title}</h2>
                <p>{item.copy}</p>
              </div>
            </article>
          )
        })}
      </section>

      <section className="landing-detail-section">
        <div className="landing-section-copy">
          <p className="eyebrow">Daily money system</p>
          <h2>Built around the records you actually check every week.</h2>
          <p>
            FundSpace brings daily entries, planning, shared spaces, and business tracking
            into one workspace so the ledger stays useful after the first week of setup.
          </p>
        </div>

        <div className="landing-module-grid">
          {landingModules.map((module) => (
            <span key={module}>{module}</span>
          ))}
        </div>
      </section>

      <section className="landing-workflow-section">
        <div className="landing-section-copy">
          <p className="eyebrow">Offline-first flow</p>
          <h2>Keep moving, then let sync catch up.</h2>
        </div>

        <div className="landing-workflow-grid">
          {workflowSteps.map((step) => {
            const Icon = step.icon

            return (
              <article className="landing-workflow-card" key={step.title}>
                <Icon aria-hidden="true" size={24} />
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="landing-use-case-section">
        <article>
          <Users aria-hidden="true" size={24} />
          <h2>For personal and shared spaces</h2>
          <p>
            Separate personal cashflow, family planning, side-hustle money, and shared
            workspace records without mixing every transaction into one pile.
          </p>
        </article>
        <article>
          <BriefcaseBusiness aria-hidden="true" size={24} />
          <h2>For small business tracking</h2>
          <p>
            Encode product costs, ingredients, sales, operating expenses, profit, and ROI
            beside the same accounts that hold the cash.
          </p>
        </article>
      </section>

      <section className="landing-snapshot-section">
        <div className="landing-section-copy">
          <p className="eyebrow">At a glance</p>
          <h2>More than a transaction list.</h2>
          <p>
            The app gives you calendar context, budget warnings, savings progress, debt
            pressure, business performance, and exportable reports.
          </p>
        </div>
        <div className="landing-snapshot-grid">
          <span>
            <CalendarDays aria-hidden="true" size={20} />
            Calendar review
          </span>
          <span>
            <BarChart3 aria-hidden="true" size={20} />
            Graph reports
          </span>
          <span>
            <PiggyBank aria-hidden="true" size={20} />
            Goals and debts
          </span>
          <span>
            <Smartphone aria-hidden="true" size={20} />
            Web, PWA, Android
          </span>
        </div>
      </section>

      <section className="landing-proof-band">
        <div>
          <BadgeCheck aria-hidden="true" size={24} />
          <h2>Install once. Track anywhere.</h2>
        </div>
        <p>
          FundSpace is built for everyday money habits: quick entries, shared spaces,
          calendar review, reports, and reliable sync when the connection returns.
        </p>
      </section>
    </main>
  )
}
