import { useRef, type PointerEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ArrowDownLeft, ArrowRight, ArrowUpRight, BarChart3, BriefcaseBusiness, Check, CloudOff, Download, LayoutDashboard, PiggyBank, RefreshCw, ShieldCheck, Smartphone, Users, WalletCards } from 'lucide-react'
import { routes } from '../../../app/routes'
import { useAuthSession } from '../../../hooks/useAuthSession'
import { isInstalledAppRuntime } from '../../../lib/runtime'
import './landing.css'

const apkDownloadHref = '/apk/fundspace-v1.0.0.apk'
const features = [
  { icon: WalletCards, number: '01', title: 'Everyday money, in order.', copy: 'Bring accounts, income, expenses, and transfers together. Know what came in, what went out, and where you stand.', tags: ['Accounts', 'Transactions', 'Categories'] },
  { icon: PiggyBank, number: '02', title: 'Make room for your goals.', copy: 'Give your plans a place to grow with savings buckets, budgets, and debt tracking that keep the next step clear.', tags: ['Savings', 'Budgets', 'Debts'] },
  { icon: BriefcaseBusiness, number: '03', title: 'See the business picture.', copy: 'Connect product costs, sales, and operating expenses to your money. Keep profit and performance in view.', tags: ['Product costing', 'Sales', 'Reports'] },
]

function MoneyScene() {
  const sceneRef = useRef<HTMLDivElement>(null)
  function tilt(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const bounds = event.currentTarget.getBoundingClientRect()
    sceneRef.current?.style.setProperty('--tilt-x', `${-(event.clientY - bounds.top - bounds.height / 2) / 65}deg`)
    sceneRef.current?.style.setProperty('--tilt-y', `${(event.clientX - bounds.left - bounds.width / 2) / 65}deg`)
  }
  function resetTilt() {
    sceneRef.current?.style.setProperty('--tilt-x', '0deg')
    sceneRef.current?.style.setProperty('--tilt-y', '0deg')
  }
  return (
    <div className="fs-scene" onPointerMove={tilt} onPointerLeave={resetTilt}>
      <div className="fs-orbit fs-orbit-one" aria-hidden="true" /><div className="fs-orbit fs-orbit-two" aria-hidden="true" />
      <div className="fs-scene-stack" ref={sceneRef}>
        <div className="fs-dashboard">
          <div className="fs-preview-top"><span><img src="/fundspace-icon.svg" alt="" /> My personal space</span><span className="fs-preview-avatar">JD</span></div>
          <div className="fs-preview-body">
            <div className="fs-preview-heading"><span><LayoutDashboard size={14} /> Overview</span><small>Sample workspace</small></div>
            <p className="fs-balance-label">Total balance</p><strong className="fs-balance">₱48,250<span>.00</span></strong>
            <div className="fs-cashflow"><span><ArrowDownLeft size={16} /> Income <b>₱62,000</b></span><span><ArrowUpRight size={16} /> Expenses <b>₱13,750</b></span></div>
            <div className="fs-chart-title"><strong>Cash flow</strong><span>This month</span></div>
            <div className="fs-chart" aria-label="Illustrative monthly cash flow chart">{[42, 63, 49, 78, 60, 88, 72, 96, 80, 108, 92, 126].map((height, index) => <div key={index}><i style={{ height }} /><i style={{ height: height * 0.53 }} /></div>)}</div>
            <div className="fs-chart-labels"><span>Week 1</span><span>Week 2</span><span>Week 3</span><span>Week 4</span></div>
            <div className="fs-preview-transaction"><span className="fs-mini-icon"><WalletCards size={17} /></span><span><strong>Daily essentials</strong><small>Personal · Expense</small></span><b>−₱850.00</b></div>
          </div>
        </div>
        <div className="fs-float fs-goal"><span className="fs-float-icon"><PiggyBank size={23} /></span><span className="fs-float-label">A little closer, every day</span><strong>Travel fund <span>75%</span></strong><div className="fs-progress"><i /></div><small>₱15,000 <span>of ₱20,000</span></small></div>
        <div className="fs-float fs-synced"><span className="fs-sync-icon"><Check size={18} /></span><span><strong>All caught up.</strong><small>Your records, in sync.</small></span></div>
        <div className="fs-coin" aria-hidden="true">₱</div>
      </div>
      <span className="fs-scene-caption">A glimpse of your money, organized. Illustrative data.</span>
    </div>
  )
}

export function LandingPage() {
  const { isLoading, session } = useAuthSession()
  if (isInstalledAppRuntime()) {
    if (isLoading) return <div className="page-state">Opening FundSpace...</div>
    return <Navigate replace to={session ? routes.dashboard : routes.login} />
  }
  return (
    <main className="fs-landing">
      <a className="fs-skip" href="#main-content">Skip to content</a>
      <div className="fs-hero-wrap">
        <nav className="fs-nav fs-container" aria-label="Main navigation">
          <a className="fs-brand" href={routes.home}><img src="/fundspace-icon.svg" alt="" />FundSpace<span className="fs-brand-dot">.</span></a>
          <div className="fs-nav-links"><a href="#features">Features</a><a href="#how-it-works">How it works</a></div>
          <a className="fs-button fs-button-small" download href={apkDownloadHref}><Download size={15} /> Get the app</a>
        </nav>
        <section className="fs-hero fs-container" id="main-content">
          <div className="fs-hero-copy">
            <p className="fs-eyebrow"><span /> YOUR MONEY. YOUR SPACE.</p>
            <h1>A little clarity.<br />A lot more<br /><span>possibility.</span></h1>
            <p className="fs-lead">Make space for a better money routine. Track, plan, and grow your personal, family, and business finances—all in one place.</p>
            <div className="fs-actions">
              <Link className="fs-button" to={routes.login}>Get started <ArrowRight aria-hidden="true" size={17} /></Link>
              <a className="fs-button" download href={apkDownloadHref}><Download size={18} /> Download for Android <ArrowUpRight size={17} /></a>
              <a className="fs-text-link" href="#features">Explore FundSpace <ArrowRight size={17} /></a>
            </div>
            <p className="fs-install-note"><Smartphone size={14} /> Android APK <span>·</span> Built to work offline</p>
            <div className="fs-hero-audience"><span>ONE APP, EVERY PART OF LIFE</span><div><span><WalletCards size={16} /> Personal</span><span><Users size={16} /> Family & shared</span><span><BriefcaseBusiness size={16} /> Business</span></div></div>
          </div>
          <MoneyScene />
        </section>
        <div className="fs-benefits fs-container"><span><CloudOff size={19} /> Life goes on. Even offline.</span><span><RefreshCw size={19} /> Reconnect. Stay in sync.</span><span><ShieldCheck size={19} /> Separate spaces. Clear records.</span></div>
      </div>
      <section className="fs-features fs-container" id="features">
        <div className="fs-section-heading"><div><p className="fs-eyebrow">LESS SCATTERED. MORE SETTLED.</p><h2>Everything adds up.<br />In one space.</h2></div><p>From your morning coffee to your next big goal, give every money move a little more context.</p></div>
        <div className="fs-feature-grid">{features.map(({ icon: Icon, number, title, copy, tags }) => <article className="fs-feature-card" key={number}><div className="fs-feature-top"><span className="fs-feature-icon"><Icon size={28} strokeWidth={1.5} /></span><span>{number} /</span></div><h3>{title}</h3><p>{copy}</p><div className="fs-tags">{tags.map(tag => <span key={tag}>{tag}</span>)}</div></article>)}</div>
      </section>
      <section className="fs-offline fs-container" id="how-it-works">
        <div className="fs-offline-visual" aria-hidden="true"><div className="fs-offline-ring" /><div className="fs-offline-tile"><CloudOff size={58} strokeWidth={1.3} /></div><span className="fs-offline-badge"><span /> Offline, still on track</span><span className="fs-offline-spark">+</span></div>
        <div className="fs-offline-copy"><p className="fs-eyebrow">BUILT FOR REAL LIFE</p><h2>No signal?<br />No interruption.</h2><p>Your money routine shouldn’t depend on your connection. Keep recording the everyday, wherever the day takes you.</p><ol className="fs-steps"><li><span>01</span><div><h3>Capture in the moment</h3><p>Record money movement, even when you’re offline.</p></div></li><li><span>02</span><div><h3>Let sync catch up</h3><p>Changes sync when your connection returns.</p></div></li><li><span>03</span><div><h3>Stay in the know</h3><p>Review anything that needs attention in Sync Center.</p></div></li></ol></div>
      </section>
      <section className="fs-closing fs-container"><div><p className="fs-eyebrow">YOUR NEXT CHAPTER STARTS HERE</p><h2>More headspace.<br />Less money guesswork.</h2><p>Your accounts, plans, and everyday progress. Together.</p><a className="fs-button" download href={apkDownloadHref}><Download size={18} /> Get FundSpace for Android <ArrowUpRight size={18} /></a></div><div className="fs-closing-symbol" aria-hidden="true"><BarChart3 size={96} strokeWidth={1} /></div></section>
      <footer className="fs-footer fs-container"><a className="fs-brand" href={routes.home}><img src="/fundspace-icon.svg" alt="" />FundSpace.</a><p>A calmer place for your money.</p><a href="#main-content">Back to top ↑</a></footer>
    </main>
  )
}
