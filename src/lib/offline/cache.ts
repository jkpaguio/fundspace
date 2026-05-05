import { getIsOnline } from './connectivity'
import { offlineDb } from './database'
import { markRecordSynced } from './records'
import type { LocalMirrorTableName } from './types'

type CacheTable = {
  bulkDelete: (keys: string[]) => Promise<void>
  bulkPut: (items: unknown[]) => Promise<unknown>
  toArray: () => Promise<Array<{ id: string; sync_status?: string }>>
}

function getCacheTable(tableName: LocalMirrorTableName) {
  return offlineDb[tableName] as unknown as CacheTable
}

export async function readCachedRecords<TRecord extends { id: string }>(
  tableName: LocalMirrorTableName,
  predicate: (record: TRecord) => boolean = () => true,
  sort: (first: TRecord, second: TRecord) => number = () => 0,
) {
  const records = await getCacheTable(tableName).toArray()

  return (records as TRecord[])
    .filter(predicate)
    .sort(sort)
}

export async function cacheServerRecords<TRecord extends { id: string; updated_at?: string }>(
  tableName: LocalMirrorTableName,
  records: TRecord[],
  stalePredicate?: (record: TRecord) => boolean,
) {
  const table = getCacheTable(tableName)
  const syncedRecords = records.map((record) => markRecordSynced(record))

  if (stalePredicate) {
    const serverIds = new Set(records.map((record) => record.id))
    const cachedRecords = await table.toArray()
    const staleIds = (cachedRecords as Array<TRecord & { sync_status?: string }>)
      .filter(stalePredicate)
      .filter((record) => !serverIds.has(record.id))
      .filter((record) => record.sync_status !== 'pending' && record.sync_status !== 'failed')
      .map((record) => record.id)

    if (staleIds.length > 0) {
      await table.bulkDelete(staleIds)
    }
  }

  if (syncedRecords.length > 0) {
    await table.bulkPut(syncedRecords)
  }

  return records
}

export async function readThroughCache<TRecord extends { id: string; updated_at?: string }>(input: {
  fetchRemote: () => Promise<TRecord[]>
  predicate?: (record: TRecord) => boolean
  sort?: (first: TRecord, second: TRecord) => number
  stalePredicate?: (record: TRecord) => boolean
  tableName: LocalMirrorTableName
}) {
  const predicate = input.predicate ?? (() => true)
  const sort = input.sort ?? (() => 0)

  if (!getIsOnline()) {
    return readCachedRecords<TRecord>(input.tableName, predicate, sort)
  }

  try {
    const remoteRecords = await input.fetchRemote()
    await cacheServerRecords(input.tableName, remoteRecords, input.stalePredicate ?? predicate)

    return remoteRecords
  } catch (error) {
    const cachedRecords = await readCachedRecords<TRecord>(input.tableName, predicate, sort)

    if (cachedRecords.length > 0) {
      return cachedRecords
    }

    throw error
  }
}
