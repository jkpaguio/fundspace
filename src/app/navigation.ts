import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  CalendarClock,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  Settings2,
  ShieldAlert,
  Tags,
  WalletCards,
  PiggyBank,
  ReceiptText,
  type LucideIcon,
} from 'lucide-react'
import { routes } from './routes'

export type NavigationItem = {
  description: string
  icon: LucideIcon
  label: string
  to: string
}

export const navItems: NavigationItem[] = [
  {
    description: 'Review balances, cash flow, and high-level signals for the active space.',
    icon: LayoutDashboard,
    label: 'Dashboard',
    to: routes.dashboard,
  },
  {
    description: 'Choose a money space, manage members, and adjust space settings.',
    icon: FolderKanban,
    label: 'Spaces',
    to: routes.workspace,
  },
  {
    description: 'Track the accounts where money is stored.',
    icon: WalletCards,
    label: 'Accounts',
    to: routes.accounts,
  },
  {
    description: 'Record income, expenses, and transfers in the ledger.',
    icon: ReceiptText,
    label: 'Transactions',
    to: routes.transactions,
  },
  {
    description: 'Organize income and spending categories.',
    icon: Tags,
    label: 'Categories',
    to: routes.categories,
  },
  {
    description: 'Set aside money into savings buckets and goal containers.',
    icon: PiggyBank,
    label: 'Savings',
    to: routes.savings,
  },
  {
    description: 'Monitor category limits and monthly budget status.',
    icon: ShieldAlert,
    label: 'Budgets',
    to: routes.budgets,
  },
  {
    description: 'Review space activity and recent operations.',
    icon: Activity,
    label: 'Activity',
    to: routes.activity,
  },
  {
    description: 'Manage recurring transaction templates.',
    icon: CalendarClock,
    label: 'Recurring',
    to: routes.recurring,
  },
  {
    description: 'Track borrowed, lent, and credit obligations.',
    icon: CreditCard,
    label: 'Debts',
    to: routes.debts,
  },
  {
    description: 'Run business costing, sales, and operating expense workflows.',
    icon: BriefcaseBusiness,
    label: 'Business',
    to: routes.business,
  },
  {
    description: 'Open reports and cross-module financial summaries.',
    icon: BarChart3,
    label: 'Reports',
    to: routes.reports,
  },
  {
    description: 'Update profile, preferences, and security settings.',
    icon: Settings2,
    label: 'Settings',
    to: routes.settings,
  },
]

export const nonBusinessOnlyRoutes = new Set<string>([
  routes.categories,
  routes.savings,
  routes.budgets,
  routes.recurring,
])

export const businessMobileRoutes = new Set<string>([
  routes.workspace,
  routes.dashboard,
  routes.transactions,
  routes.business,
])

export const defaultMobileRoutes = new Set<string>([
  routes.workspace,
  routes.dashboard,
  routes.accounts,
  routes.transactions,
])
