import Dexie, { type Table } from 'dexie'
import type {
  LocalAccount,
  LocalActivityLog,
  LocalBudget,
  LocalBusiness,
  LocalBusinessExpense,
  LocalCategory,
  LocalDebt,
  LocalDebtPayment,
  LocalProduct,
  LocalProductIngredient,
  LocalRecurringTransaction,
  LocalReportInput,
  LocalSale,
  LocalSavingsBucket,
  LocalTransaction,
  LocalWorkspace,
  LocalWorkspaceMember,
  SyncConflict,
  SyncMeta,
  SyncOutboxItem,
} from './types'

export class FundSpaceOfflineDatabase extends Dexie {
  accounts!: Table<LocalAccount, string>
  activity_logs!: Table<LocalActivityLog, string>
  budgets!: Table<LocalBudget, string>
  business_expenses!: Table<LocalBusinessExpense, string>
  businesses!: Table<LocalBusiness, string>
  categories!: Table<LocalCategory, string>
  debt_payments!: Table<LocalDebtPayment, string>
  debts!: Table<LocalDebt, string>
  product_ingredients!: Table<LocalProductIngredient, string>
  products!: Table<LocalProduct, string>
  recurring_transactions!: Table<LocalRecurringTransaction, string>
  report_inputs!: Table<LocalReportInput, string>
  sales!: Table<LocalSale, string>
  savings_buckets!: Table<LocalSavingsBucket, string>
  sync_conflicts!: Table<SyncConflict, string>
  sync_meta!: Table<SyncMeta, string>
  sync_outbox!: Table<SyncOutboxItem, string>
  transactions!: Table<LocalTransaction, string>
  workspace_members!: Table<LocalWorkspaceMember, string>
  workspaces!: Table<LocalWorkspace, string>

  constructor() {
    super('fundspace_offline')

    this.version(1).stores({
      accounts: 'id, workspace_id, created_by, sync_status, server_updated_at, last_synced_at',
      activity_logs: 'id, workspace_id, user_id, entity_type, entity_id, sync_status, created_at',
      budgets: 'id, workspace_id, category_id, [workspace_id+month+year], sync_status, server_updated_at, last_synced_at',
      business_expenses: 'id, business_id, transaction_id, category_id, expense_date, sync_status, server_updated_at, last_synced_at',
      businesses: 'id, workspace_id, created_by, sync_status, server_updated_at, last_synced_at',
      categories: 'id, workspace_id, type, is_archived, sync_status, server_updated_at, last_synced_at',
      debt_payments: 'id, debt_id, transaction_id, payment_date, sync_status, last_synced_at',
      debts: 'id, workspace_id, status, created_by, sync_status, server_updated_at, last_synced_at',
      product_ingredients: 'id, product_id, sync_status, server_updated_at, last_synced_at',
      products: 'id, business_id, is_active, created_by, sync_status, server_updated_at, last_synced_at',
      recurring_transactions: 'id, workspace_id, account_id, type, is_active, next_run_date, sync_status, server_updated_at, last_synced_at',
      report_inputs: 'id, workspace_id, report_key, sync_status, updated_at, last_synced_at',
      sales: 'id, business_id, product_id, transaction_id, sale_date, sync_status, server_updated_at, last_synced_at',
      savings_buckets: 'id, workspace_id, linked_account_id, is_archived, sync_status, server_updated_at, last_synced_at',
      sync_conflicts: 'id, outbox_id, table_name, record_id, workspace_id, resolved_at, created_at',
      sync_meta: 'key, updated_at',
      sync_outbox: 'id, table_name, record_id, local_record_id, workspace_id, operation, status, created_at, last_attempt_at',
      transactions: 'id, workspace_id, account_id, category_id, debt_id, bucket_id, reference_group_id, transaction_date, type, sync_status, server_updated_at, last_synced_at',
      workspace_members: 'id, workspace_id, user_id, role, status, sync_status, server_updated_at, last_synced_at',
      workspaces: 'id, owner_id, type, sync_status, server_updated_at, last_synced_at',
    })
  }
}

export const offlineDb = new FundSpaceOfflineDatabase()

export async function openOfflineDatabase() {
  if (!offlineDb.isOpen()) {
    await offlineDb.open()
  }

  return offlineDb
}
