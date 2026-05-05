import { supabase } from '../supabase'
import { registerReplayHandler } from './syncEngine'
import type { QueuedRpcPayload, QueuedTableInsertPayload, QueuedTableUpdatePayload } from './writeQueue'
import type { LocalMirrorTableName, SyncOutboxItem } from './types'

const replayTables: LocalMirrorTableName[] = [
  'workspaces',
  'workspace_members',
  'accounts',
  'categories',
  'transactions',
  'savings_buckets',
  'budgets',
  'activity_logs',
  'recurring_transactions',
  'debts',
  'debt_payments',
  'businesses',
  'products',
  'product_ingredients',
  'sales',
  'business_expenses',
]

let areDefaultReplayHandlersRegistered = false

function isTableInsertPayload(payload: unknown): payload is QueuedTableInsertPayload {
  return typeof payload === 'object' && payload !== null && (payload as { kind?: unknown }).kind === 'table_insert'
}

function isTableUpdatePayload(payload: unknown): payload is QueuedTableUpdatePayload {
  return typeof payload === 'object' && payload !== null && (payload as { kind?: unknown }).kind === 'table_update'
}

function isRpcPayload(payload: unknown): payload is QueuedRpcPayload {
  return typeof payload === 'object' && payload !== null && (payload as { kind?: unknown }).kind === 'rpc'
}

async function getServerRecord(tableName: LocalMirrorTableName, item: SyncOutboxItem) {
  if (!item.record_id || item.operation === 'create' || item.operation === 'rpc') {
    return null
  }

  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .eq('id', item.record_id)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

async function replayItem(tableName: LocalMirrorTableName, item: SyncOutboxItem) {
  if (isRpcPayload(item.payload)) {
    const { error } = await supabase.rpc(item.payload.rpcName, item.payload.args)

    if (error) {
      throw error
    }

    return
  }

  if (isTableInsertPayload(item.payload)) {
    const { error } = await supabase.from(tableName).insert(item.payload.values)

    if (error) {
      throw error
    }

    return
  }

  if (isTableUpdatePayload(item.payload)) {
    const { error } = await supabase
      .from(tableName)
      .update(item.payload.updates)
      .eq(item.payload.match.column, item.payload.match.value)

    if (error) {
      throw error
    }

    return
  }

  throw new Error(`Unsupported queued payload for ${tableName}.`)
}

export function registerDefaultReplayHandlers() {
  if (areDefaultReplayHandlersRegistered) {
    return
  }

  replayTables.forEach((tableName) => {
    registerReplayHandler(tableName, {
      getServerRecord: (item) => getServerRecord(tableName, item),
      replay: (item) => replayItem(tableName, item),
    })
  })

  areDefaultReplayHandlersRegistered = true
}
