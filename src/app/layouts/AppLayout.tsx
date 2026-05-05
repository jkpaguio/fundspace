import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  FolderKanban,
  LogOut,
  MoreHorizontal,
  Settings2,
} from 'lucide-react'
import { EmptyState } from '../../components/common/EmptyState'
import { ThemeToggle } from '../../components/common/ThemeToggle'
import { Button } from '../../components/ui'
import { routeLabels, routes } from '../routes'
import {
  getMoreNavigationSections,
  noSpaceNavItems,
  primaryNavItems,
} from '../navigation'
import { useWorkspaceSelection } from '../../hooks/useWorkspaceSelection'
import { useThemePreference } from '../../hooks/useThemePreference'
import { signOut } from '../../features/auth/services/authService'
import type { WorkspaceType } from '../../types/domain'

const workspaceTypeLabels: Record<WorkspaceType, string> = {
  business: 'Business space',
  family: 'Family space',
  other: 'Other space',
  personal: 'Personal space',
  side_hustle: 'Side hustle space',
}

const routesAllowedWithoutSpace = new Set<string>([
  routes.workspace,
  routes.createWorkspace,
  routes.settings,
  routes.syncCenter,
  routes.currencySettings,
  routes.workspaceSettings,
])

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logoSrc, theme, toggleTheme } = useThemePreference()
  const workspaceContext = useWorkspaceSelection()
  const { isLoading, selectedWorkspace, selectWorkspace, workspaces } =
    workspaceContext

  const isBusinessWorkspace =
    selectedWorkspace?.type === 'business' || selectedWorkspace?.type === 'side_hustle'

  const moreSections = getMoreNavigationSections(isBusinessWorkspace)
  const hasMoreItems = moreSections.length > 0
  const desktopNavItems = selectedWorkspace ? primaryNavItems : noSpaceNavItems
  const currentPageLabel = routeLabels[location.pathname] ?? 'FundSpace app'
  const isSpaceChooserRoute =
    location.pathname === routes.workspace || location.pathname === routes.createWorkspace
  const shouldGateForSpace =
    !isLoading && !selectedWorkspace && !routesAllowedWithoutSpace.has(location.pathname)

  const handleSignOut = async () => {
    const { error } = await signOut()

    if (!error) {
      navigate(routes.login)
    }
  }

  return (
    <main className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img alt="FundSpace" className="sidebar-brand-logo" src={logoSrc} />
          <span>FundSpace</span>
        </div>

        {selectedWorkspace && (
          <section className="workspace-identity-card">
            <p className="eyebrow">Active space</p>
            <strong>{selectedWorkspace.name}</strong>
            <span>{workspaceTypeLabels[selectedWorkspace.type]}</span>
            <span>
              {selectedWorkspace.membership?.role ?? 'member'} /{' '}
              {selectedWorkspace.membership?.status ?? 'active'}
            </span>
          </section>
        )}

        <nav className="sidebar-nav" aria-label="Main navigation">
          {desktopNavItems.map((item) => {
            const Icon = item.icon

            return (
              <NavLink className="nav-button" key={item.label} to={item.to}>
                <Icon aria-hidden="true" size={18} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}

          {selectedWorkspace && hasMoreItems && (
            <NavLink className="nav-button" to={routes.more}>
              <MoreHorizontal aria-hidden="true" size={18} />
              <span>More</span>
            </NavLink>
          )}
        </nav>

        {!isSpaceChooserRoute && (
          <label className="workspace-switcher">
            <span>Space</span>
            <select
              disabled={isLoading || workspaces.length === 0}
              onChange={(event) => {
                if (event.target.value) {
                  selectWorkspace(event.target.value)
                }
              }}
              value={selectedWorkspace?.id ?? ''}
            >
              {!selectedWorkspace && workspaces.length > 0 && <option value="">Choose a space</option>}
              {workspaces.length === 0 && <option value="">No space yet</option>}
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <Button className="sidebar-signout" onClick={() => void handleSignOut()} type="button" variant="ghost">
          <LogOut aria-hidden="true" size={16} />
          Sign out
        </Button>
      </aside>

      <section className="app-content">
        <header className="mobile-shell-header">
          <div className="mobile-shell-top">
            <div className="mobile-shell-brand">
              <img alt="FundSpace" className="sidebar-brand-logo" src={logoSrc} />
              <div>
                <span className="mobile-shell-app-name">FundSpace</span>
                <strong>{currentPageLabel}</strong>
              </div>
            </div>

            <div className="mobile-shell-actions">
              <ThemeToggle compact onToggle={toggleTheme} theme={theme} />
              {location.pathname !== routes.settings && (
                <Button
                  aria-label="Open settings"
                  className="mobile-shell-icon-button"
                  onClick={() => navigate(routes.settings)}
                  type="button"
                  variant="ghost"
                >
                  <Settings2 aria-hidden="true" size={16} />
                </Button>
              )}
            </div>
          </div>
        </header>

        <header className="app-topbar">
          <div>
            <div className="app-breadcrumbs" aria-label="Space context breadcrumbs">
              <span>FundSpace</span>
              <span aria-hidden="true">/</span>
              <span>{selectedWorkspace?.name ?? 'No space selected'}</span>
              <span aria-hidden="true">/</span>
              <span>{currentPageLabel}</span>
            </div>
            <p className="eyebrow">Active space</p>
            <strong>{selectedWorkspace?.name ?? 'Select a space'}</strong>
            <span>
              {selectedWorkspace
                ? workspaceTypeLabels[selectedWorkspace.type]
                : 'Choose a space to load the right tools'}
            </span>
          </div>

          <div className="topbar-actions">
            <ThemeToggle onToggle={toggleTheme} theme={theme} />
            <Button onClick={() => navigate(routes.settings)} type="button" variant="ghost">
              <Settings2 aria-hidden="true" size={16} />
              Settings
            </Button>
            {!isSpaceChooserRoute && (
              <Button onClick={() => navigate(routes.workspace)} type="button" variant="secondary">
                Switch space
              </Button>
            )}
          </div>
        </header>

        {!isSpaceChooserRoute && (
          <nav className="mobile-primary-nav" aria-label="Primary mobile navigation">
            {desktopNavItems.map((item) => {
              const Icon = item.icon

              return (
                <NavLink className="mobile-primary-link" key={item.label} to={item.to}>
                  <Icon aria-hidden="true" size={18} />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}

            {selectedWorkspace && hasMoreItems && (
              <NavLink className="mobile-primary-link" to={routes.more}>
                <MoreHorizontal aria-hidden="true" size={18} />
                <span>More</span>
              </NavLink>
            )}
          </nav>
        )}

        {isLoading ? (
          <p className="page-state">Loading your spaces...</p>
        ) : shouldGateForSpace ? (
          <EmptyState
            action={
              <>
                <Button onClick={() => navigate(routes.workspace)} type="button">
                  <FolderKanban aria-hidden="true" size={18} />
                  Create or select a space
                </Button>
                <Button onClick={() => navigate(routes.settings)} type="button" variant="secondary">
                  Open settings
                </Button>
              </>
            }
            description="Money features need an active space so accounts, transactions, budgets, and reports stay in the right place."
            title="Create or select a space first"
          />
        ) : (
          <Outlet context={workspaceContext} />
        )}

        {!isSpaceChooserRoute && <div className="mobile-nav-spacer" aria-hidden="true" />}
      </section>
    </main>
  )
}
