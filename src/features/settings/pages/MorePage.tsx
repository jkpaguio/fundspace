import { NavLink } from 'react-router-dom'
import { PageHeader } from '../../../components/common/PageHeader'
import { navItems, nonBusinessOnlyRoutes } from '../../../app/navigation'
import { routes } from '../../../app/routes'
import { useWorkspaceOutlet } from '../../../hooks/useWorkspaceOutlet'

const primaryRoutes = new Set<string>([
  routes.workspace,
  routes.dashboard,
  routes.accounts,
  routes.transactions,
  routes.business,
  routes.more,
])

export function MorePage() {
  const { selectedWorkspace } = useWorkspaceOutlet()
  const isBusinessWorkspace =
    selectedWorkspace?.type === 'business' || selectedWorkspace?.type === 'side_hustle'

  const availableItems = navItems.filter((item) => {
    if (item.to === routes.business) {
      return isBusinessWorkspace
    }

    if (isBusinessWorkspace && nonBusinessOnlyRoutes.has(item.to)) {
      return false
    }

    return !primaryRoutes.has(item.to)
  })

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Navigation"
        heading="More"
        lead="Find the tools you do not need every day without crowding the main navigation."
      />

      <section className="more-grid">
        {availableItems.map((item) => {
          const Icon = item.icon

          return (
            <NavLink className="more-nav-card" key={item.to} to={item.to}>
              <Icon aria-hidden="true" size={20} />
              <div>
                <strong>{item.label}</strong>
                <p>{item.description}</p>
              </div>
            </NavLink>
          )
        })}
      </section>
    </div>
  )
}
