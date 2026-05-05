import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  CirclePlus,
  CalendarDays,
  CalendarClock,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  Settings2,
  RefreshCw,
  ShieldAlert,
  WalletCards,
  PiggyBank,
  ReceiptText,
  type LucideIcon,
} from 'lucide-react'
import { routes } from './routes'

type NavigationAudience = 'all' | 'business_only' | 'non_business_only'
type MoreSectionId = 'setup' | 'planning' | 'operations' | 'space' | 'preferences'

export type NavigationItem = {
  audience?: NavigationAudience
  description: string
  group?: MoreSectionId
  icon: LucideIcon
  label: string
  to: string
}

export type NavigationSection = {
  description: string
  id: MoreSectionId
  title: string
}

export const primaryNavItems: NavigationItem[] = [
  {
    description: 'Review balances, cash flow, and high-level signals for the active space.',
    icon: LayoutDashboard,
    label: 'Home',
    to: routes.dashboard,
  },
  {
    description: 'Choose the kind of money movement you want to record next.',
    icon: CirclePlus,
    label: 'Add',
    to: routes.add,
  },
  {
    description: 'Review balances, cash flow, and high-level signals for the active space.',
    icon: ReceiptText,
    label: 'Transactions',
    to: routes.transactions,
  },
  {
    description: 'Open reports and cross-module financial summaries.',
    icon: BarChart3,
    label: 'Reports',
    to: routes.reports,
  },
]

export const noSpaceNavItems: NavigationItem[] = [
  {
    description: 'Choose a money space, manage members, and adjust space settings.',
    icon: FolderKanban,
    label: 'Spaces',
    to: routes.workspace,
  },
  {
    description: 'Review offline queue, sync failures, and conflicts.',
    group: 'preferences',
    icon: RefreshCw,
    label: 'Sync Center',
    to: routes.syncCenter,
  },
  {
    description: 'Update profile, preferences, and security settings.',
    icon: Settings2,
    label: 'Settings',
    to: routes.settings,
  },
]

const moreNavigationItems: NavigationItem[] = [
  {
    description: 'Track the accounts where money is stored.',
    group: 'setup',
    icon: WalletCards,
    label: 'Accounts',
    to: routes.accounts,
  },
  {
    description: 'Record income, expenses, and transfers in the ledger.',
    group: 'setup',
    icon: ReceiptText,
    label: 'Categories',
    to: routes.categories,
  },
  {
    description: 'Open the transaction calendar entry point and review day-based activity once it is ready.',
    group: 'planning',
    icon: CalendarDays,
    label: 'Calendar',
    to: routes.calendar,
  },
  {
    audience: 'non_business_only',
    description: 'Set aside money into savings buckets and goal containers.',
    group: 'planning',
    icon: PiggyBank,
    label: 'Savings',
    to: routes.savings,
  },
  {
    audience: 'non_business_only',
    description: 'Monitor category limits and monthly budget status.',
    group: 'planning',
    icon: ShieldAlert,
    label: 'Budgets',
    to: routes.budgets,
  },
  {
    description: 'Track borrowed, lent, and credit obligations.',
    group: 'planning',
    icon: CreditCard,
    label: 'Debts',
    to: routes.debts,
  },
  {
    audience: 'non_business_only',
    description: 'Manage recurring transaction templates.',
    group: 'planning',
    icon: CalendarClock,
    label: 'Recurring',
    to: routes.recurring,
  },
  {
    description: 'Review space activity and recent operations.',
    group: 'operations',
    icon: Activity,
    label: 'Activity',
    to: routes.activity,
  },
  {
    audience: 'business_only',
    description: 'Run business costing, sales, and operating expense workflows.',
    group: 'operations',
    icon: BriefcaseBusiness,
    label: 'Business',
    to: routes.business,
  },
  {
    description: 'Choose a money space, manage members, and adjust space settings.',
    group: 'space',
    icon: FolderKanban,
    label: 'Spaces',
    to: routes.workspace,
  },
  {
    description: 'Update profile, preferences, and security settings.',
    group: 'preferences',
    icon: Settings2,
    label: 'Settings',
    to: routes.settings,
  },
]

export const moreNavigationSections: NavigationSection[] = [
  {
    description: 'Keep the space ready for clean daily entries.',
    id: 'setup',
    title: 'Space setup',
  },
  {
    description: 'Planning tools that help you stay ahead.',
    id: 'planning',
    title: 'Planning ahead',
  },
  {
    description: 'Deeper operating tools and audit views.',
    id: 'operations',
    title: 'Operations and history',
  },
  {
    description: 'Switch spaces or adjust how this shared area works.',
    id: 'space',
    title: 'Space and members',
  },
  {
    description: 'Profile, preferences, and app controls.',
    id: 'preferences',
    title: 'Preferences',
  },
]

function isRouteVisible(item: NavigationItem, isBusinessWorkspace: boolean) {
  if (item.audience === 'business_only') {
    return isBusinessWorkspace
  }

  if (item.audience === 'non_business_only') {
    return !isBusinessWorkspace
  }

  return true
}

export function getMoreNavigationSections(isBusinessWorkspace: boolean) {
  return moreNavigationSections
    .map((section) => ({
      ...section,
      items: moreNavigationItems.filter(
        (item) => item.group === section.id && isRouteVisible(item, isBusinessWorkspace),
      ),
    }))
    .filter((section) => section.items.length > 0)
}
