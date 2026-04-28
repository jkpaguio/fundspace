import { Navigate, Outlet } from 'react-router-dom'
import { routes } from '../../app/routes'
import { useAuthSession } from '../../hooks/useAuthSession'

export function RequireAuth() {
  const { isLoading, session } = useAuthSession()

  if (isLoading) {
    return <div className="page-state">Checking session...</div>
  }

  if (!session) {
    return <Navigate replace to={routes.login} />
  }

  return <Outlet />
}

export function RedirectIfAuthenticated() {
  const { isLoading, session } = useAuthSession()

  if (isLoading) {
    return <div className="page-state">Checking session...</div>
  }

  if (session) {
    return <Navigate replace to={routes.workspace} />
  }

  return <Outlet />
}
