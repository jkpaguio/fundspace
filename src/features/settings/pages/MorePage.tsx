import { NavLink, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { PageHeader } from '../../../components/common/PageHeader'
import { Button } from '../../../components/ui'
import { getMoreNavigationSections } from '../../../app/navigation'
import { routes } from '../../../app/routes'
import { useWorkspaceOutlet } from '../../../hooks/useWorkspaceOutlet'
import { signOut } from '../../auth/services/authService'

export function MorePage() {
  const navigate = useNavigate()
  const { selectedWorkspace } = useWorkspaceOutlet()
  const isBusinessWorkspace =
    selectedWorkspace?.type === 'business' || selectedWorkspace?.type === 'side_hustle'
  const sections = getMoreNavigationSections(isBusinessWorkspace)

  const handleSignOut = async () => {
    const { error } = await signOut()

    if (!error) {
      navigate(routes.login)
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Tools and setup"
        heading="More"
        lead="Open planning, setup, and deeper tools from one compact hub."
      />

      <section className="section-surface section-surface-hero more-overview-strip">
        <div className="section-heading section-heading-stack">
          <div>
            <p className="eyebrow">Tool hub</p>
            <h2>{selectedWorkspace ? selectedWorkspace.name : 'Your account'}</h2>
            <p className="section-description">Daily actions stay in Home, Add, and Transactions.</p>
          </div>
        </div>
      </section>

      {sections.map((section) => (
        <section className={`more-section-shelf more-section-shelf-${section.id}`} key={section.id}>
          <div className="section-heading section-heading-stack">
            <div>
              <h2>{section.title}</h2>
              <p className="section-description">{section.description}</p>
            </div>
          </div>

          <div className="more-tile-grid">
            {section.items.map((item) => {
              const Icon = item.icon

              return (
                <NavLink className="more-tool-tile" key={item.to} to={item.to}>
                  <span className="more-tool-icon">
                    <Icon aria-hidden="true" size={22} />
                  </span>
                  <strong className="more-tool-label">{item.label}</strong>
                </NavLink>
              )
            })}
          </div>
        </section>
      ))}

      <section className="budget-warning budget-warning-soft">
        <LogOut aria-hidden="true" size={20} />
        <div>
          <h2>Leave this session</h2>
          <p>Sign out here if you are done and want to return to the login screen.</p>
          <div className="empty-state-actions">
            <Button onClick={() => void handleSignOut()} type="button" variant="secondary">
              Sign out
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
