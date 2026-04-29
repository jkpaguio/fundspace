import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { AuthLayout } from './layouts/AuthLayout'
import { routes } from './routes'
import { RedirectIfAuthenticated, RequireAuth } from '../components/common/RouteGuards'
import { AccountsPage } from '../features/accounts/pages/AccountsPage'
import { CompleteProfilePage } from '../features/auth/pages/CompleteProfilePage'
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { RegisterPage } from '../features/auth/pages/RegisterPage'
import { ActivityPage } from '../features/activity/pages/ActivityPage'
import { BusinessPage } from '../features/business/pages/BusinessPage'
import { BudgetsPage } from '../features/budgets/pages/BudgetsPage'
import { CategoriesPage } from '../features/categories/pages/CategoriesPage'
import { DebtsPage } from '../features/debts/pages/DebtsPage'
import { DashboardPage } from '../features/reports/pages/DashboardPage'
import { ReportsPage } from '../features/reports/pages/ReportsPage'
import { RecurringPage } from '../features/recurring/pages/RecurringPage'
import { MorePage } from '../features/settings/pages/MorePage'
import { CurrencySettingsPage } from '../features/settings/pages/CurrencySettingsPage'
import { SettingsPage } from '../features/settings/pages/SettingsPage'
import { WorkspaceSettingsPage } from '../features/settings/pages/WorkspaceSettingsPage'
import { SavingsPage } from '../features/savings/pages/SavingsPage'
import { TransactionsPage } from '../features/transactions/pages/TransactionsPage'
import { CreateWorkspacePage } from '../features/workspaces/pages/CreateWorkspacePage'
import { WorkspacesPage } from '../features/workspaces/pages/WorkspacesPage'

const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      {
        element: <RedirectIfAuthenticated />,
        children: [
          { path: routes.login, element: <LoginPage /> },
          { path: routes.register, element: <RegisterPage /> },
          { path: routes.forgotPassword, element: <ForgotPasswordPage /> },
        ],
      },
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
          { path: routes.more, element: <MorePage /> },
          { path: routes.workspace, element: <WorkspacesPage /> },
          { path: routes.createWorkspace, element: <CreateWorkspacePage /> },
          { path: routes.accounts, element: <AccountsPage /> },
          { path: routes.transactions, element: <TransactionsPage /> },
          { path: routes.categories, element: <CategoriesPage /> },
          { path: routes.savings, element: <SavingsPage /> },
          { path: routes.budgets, element: <BudgetsPage /> },
          { path: routes.activity, element: <ActivityPage /> },
          { path: routes.recurring, element: <RecurringPage /> },
          { path: routes.debts, element: <DebtsPage /> },
          { path: routes.business, element: <BusinessPage /> },
          { path: routes.reports, element: <ReportsPage /> },
          { path: routes.settings, element: <SettingsPage /> },
          { path: routes.currencySettings, element: <CurrencySettingsPage /> },
          { path: routes.workspaceSettings, element: <WorkspaceSettingsPage /> },
        ],
      },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
