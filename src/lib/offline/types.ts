import type {
  Account,
  ActivityLog,
  Budget,
  Business,
  BusinessExpense,
  Category,
  Debt,
  DebtPayment,
  Product,
  ProductIngredient,
  RecurringTransaction,
  Sale,
  SavingsBucket,
  Transaction,
  Workspace,
  WorkspaceMember,
} from '../../types/domain'

export type OfflineSyncStatus = 'synced' | 'pending' | 'syncing' | 'failed' | 'conflict'

export type OfflineRecordMetadata = {
  last_synced_at: string | null
  local_id?: string
  server_updated_at: string | null
  sync_error?: string | null
  sync_status: OfflineSyncStatus
}

export type LocalRecord<TRecord> = TRecord & OfflineRecordMetadata

export type LocalWorkspace = LocalRecord<Workspace>
export type LocalWorkspaceMember = LocalRecord<WorkspaceMember>
export type LocalAccount = LocalRecord<Account>
export type LocalCategory = LocalRecord<Category>
export type LocalTransaction = LocalRecord<Transaction>
export type LocalSavingsBucket = LocalRecord<SavingsBucket>
export type LocalBudget = LocalRecord<Budget>
export type LocalActivityLog = LocalRecord<ActivityLog>
export type LocalRecurringTransaction = LocalRecord<RecurringTransaction>
export type LocalDebt = LocalRecord<Debt>
export type LocalDebtPayment = LocalRecord<DebtPayment>
export type LocalBusiness = LocalRecord<Business>
export type LocalProduct = LocalRecord<Product>
export type LocalProductIngredient = LocalRecord<ProductIngredient>
export type LocalSale = LocalRecord<Sale>
export type LocalBusinessExpense = LocalRecord<BusinessExpense>

export type LocalReportInput = OfflineRecordMetadata & {
  id: string
  report_key: string
  snapshot: unknown
  workspace_id: string
  created_at: string
  updated_at: string
}

export type SyncOperationType = 'create' | 'update' | 'archive' | 'delete' | 'rpc'

export type SyncOutboxStatus = 'pending' | 'syncing' | 'failed' | 'conflict'

export type AppSyncStatus = 'offline' | 'syncing' | 'synced' | 'needs_attention'

export type SyncStatusSnapshot = {
  conflictCount: number
  isOnline: boolean
  lastError: string | null
  lastSyncedAt: string | null
  pendingCount: number
  status: AppSyncStatus
}

export type SyncOutboxItem = {
  id: string
  base_server_updated_at: string | null
  created_at: string
  error_message: string | null
  last_attempt_at: string | null
  local_record_id: string | null
  operation: SyncOperationType
  payload: unknown
  record_id: string | null
  retry_count: number
  status: SyncOutboxStatus
  table_name: LocalMirrorTableName
  workspace_id: string | null
}

export type SyncConflict = {
  id: string
  created_at: string
  local_payload: unknown
  outbox_id: string | null
  reason: string
  record_id: string | null
  resolved_at: string | null
  server_payload: unknown
  table_name: LocalMirrorTableName
  workspace_id: string | null
}

export type SyncMeta = {
  key: string
  updated_at: string
  value: unknown
}

export type LocalMirrorTableName =
  | 'workspaces'
  | 'workspace_members'
  | 'accounts'
  | 'categories'
  | 'transactions'
  | 'savings_buckets'
  | 'budgets'
  | 'activity_logs'
  | 'recurring_transactions'
  | 'debts'
  | 'debt_payments'
  | 'businesses'
  | 'products'
  | 'product_ingredients'
  | 'sales'
  | 'business_expenses'
  | 'report_inputs'

export const defaultOfflineMetadata = (
  serverUpdatedAt: string | null = null,
): OfflineRecordMetadata => ({
  last_synced_at: null,
  server_updated_at: serverUpdatedAt,
  sync_error: null,
  sync_status: 'pending',
})
