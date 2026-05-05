import { supabase } from '../supabase'
import { getIsOnline } from './connectivity'
import { offlineDb } from './database'
import { createOfflineId } from './ids'
import { markRecordPending } from './records'
import { enqueueSyncOperation } from './syncStore'
import type { LocalMirrorTableName } from './types'

type LocalTable = {
  get: (key: string) => Promise<Record<string, unknown> | undefined>
  put: (item: Record<string, unknown>) => Promise<unknown>
  update: (key: string, changes: Record<string, unknown>) => Promise<number>
}

export type QueuedTableInsertPayload = {
  kind: 'table_insert'
  values: Record<string, unknown>
}

export type QueuedTableUpdatePayload = {
  kind: 'table_update'
  match: {
    column: string
    value: string
  }
  updates: Record<string, unknown>
}

export type QueuedRpcPayload = {
  args: Record<string, unknown>
  kind: 'rpc'
  rpcName: string
}

function getLocalTable(tableName: LocalMirrorTableName) {
  return offlineDb[tableName] as unknown as LocalTable
}

export async function getCurrentUserIdForOfflineWrite() {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    throw error
  }

  const userId = data.session?.user.id

  if (!userId) {
    throw new Error('You need to be signed in before this can be saved offline.')
  }

  return userId
}

export async function queueTableInsert<TRecord extends { id: string }>(input: {
  record: TRecord
  remoteValues: Record<string, unknown>
  tableName: LocalMirrorTableName
  workspaceId?: string | null
}) {
  const pendingRecord = markRecordPending(input.record, input.record.id)

  await getLocalTable(input.tableName).put(pendingRecord)
  await enqueueSyncOperation({
    localRecordId: input.record.id,
    operation: 'create',
    payload: {
      kind: 'table_insert',
      values: input.remoteValues,
    } satisfies QueuedTableInsertPayload,
    recordId: input.record.id,
    tableName: input.tableName,
    workspaceId: input.workspaceId ?? null,
  })

  return pendingRecord
}

export async function queueTableUpdate(input: {
  baseServerUpdatedAt?: string | null
  recordId: string
  tableName: LocalMirrorTableName
  updates: Record<string, unknown>
  workspaceId?: string | null
}) {
  const table = getLocalTable(input.tableName)
  const current = await table.get(input.recordId)

  if (current) {
    await table.update(input.recordId, {
      ...input.updates,
      server_updated_at: input.baseServerUpdatedAt ?? current.server_updated_at ?? null,
      sync_error: null,
      sync_status: 'pending',
    })
  }

  await enqueueSyncOperation({
    baseServerUpdatedAt: input.baseServerUpdatedAt ?? null,
    operation: 'update',
    payload: {
      kind: 'table_update',
      match: {
        column: 'id',
        value: input.recordId,
      },
      updates: input.updates,
    } satisfies QueuedTableUpdatePayload,
    recordId: input.recordId,
    tableName: input.tableName,
    workspaceId: input.workspaceId ?? null,
  })
}

export async function queueRpc(input: {
  args: Record<string, unknown>
  rpcName: string
  tableName: LocalMirrorTableName
  workspaceId?: string | null
}) {
  await enqueueSyncOperation({
    operation: 'rpc',
    payload: {
      args: input.args,
      kind: 'rpc',
      rpcName: input.rpcName,
    } satisfies QueuedRpcPayload,
    recordId: createOfflineId(),
    tableName: input.tableName,
    workspaceId: input.workspaceId ?? null,
  })
}

export function shouldQueueOfflineWrite() {
  return !getIsOnline()
}
