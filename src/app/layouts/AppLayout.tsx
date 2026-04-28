import { NavLink, Outlet } from 'react-router-dom'
import { FolderKanban, LayoutDashboard, ReceiptText, Tags, WalletCards } from 'lucide-react'
import { routes } from '../routes'
import { useWorkspaceSelection } from '../../hooks/useWorkspaceSelection'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, to: routes.dashboard },
  { label: 'Workspaces', icon: FolderKanban, to: routes.workspace },
  { label: 'Accounts', icon: WalletCards, to: routes.accounts },
  { label: 'Transactions', icon: ReceiptText, to: routes.transactions },
  { label: 'Categories', icon: Tags, to: routes.categories },
]

export function AppLayout() {
  const workspaceContext = useWorkspaceSelection()
  const { isLoading, selectedWorkspace, selectWorkspace, workspaces } =
    workspaceContext

  return (
    <main className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <WalletCards aria-hidden="true" size={22} />
          <span>FundSpace</span>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon

            return (
              <NavLink className="nav-button" key={item.label} to={item.to}>
                <Icon aria-hidden="true" size={18} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <label className="workspace-switcher">
          <span>Workspace</span>
          <select
            disabled={isLoading || workspaces.length === 0}
            onChange={(event) => selectWorkspace(event.target.value)}
            value={selectedWorkspace?.id ?? ''}
          >
            {workspaces.length === 0 && <option value="">No workspace</option>}
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
        </label>
      </aside>

      <section className="app-content">
        <Outlet context={workspaceContext} />
      </section>
    </main>
  )
}
