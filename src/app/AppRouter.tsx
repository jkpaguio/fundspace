import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { AuthLayout } from './layouts/AuthLayout'
import { routes } from './routes'
import { RequireAuth } from '../components/common/RouteGuards'
import { AccountsPage } from '../features/accounts/pages/AccountsPage'
import { CompleteProfilePage } from '../features/auth/pages/CompleteProfilePage'
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { RegisterPage } from '../features/auth/pages/RegisterPage'
import { CategoriesPage } from '../features/categories/pages/CategoriesPage'
import { DashboardPage } from '../features/reports/pages/DashboardPage'
import { TransactionsPage } from '../features/transactions/pages/TransactionsPage'
import { WorkspacesPage } from '../features/workspaces/pages/WorkspacesPage'

const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: routes.login, element: <LoginPage /> },
      { path: routes.register, element: <RegisterPage /> },
      { path: routes.forgotPassword, element: <ForgotPasswordPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AuthLayout />,
        children: [{ path: routes.completeProfile, element: <CompleteProfilePage /> }],
      },
      {
        element: <AppLayout />,
        children: [
          { path: routes.home, element: <Navigate replace to={routes.dashboard} /> },
          { path: routes.dashboard, element: <DashboardPage /> },
          { path: routes.workspace, element: <WorkspacesPage /> },
          { path: routes.accounts, element: <AccountsPage /> },
          { path: routes.transactions, element: <TransactionsPage /> },
          { path: routes.categories, element: <CategoriesPage /> },
        ],
      },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
