import { supabase } from '../../../lib/supabase'
import {
  createOfflineId,
  getCurrentUserIdForOfflineWrite,
  queueTableInsert,
  queueTableUpdate,
  readThroughCache,
  shouldQueueOfflineWrite,
} from '../../../lib/offline'
import type { Account, AccountType, CurrencyCode } from '../../../types/domain'

export async function listAccounts(workspaceId: string) {
  return readThroughCache<Account>({
    fetchRemote: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('is_archived', false)
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      return (data ?? []) as Account[]
    },
    predicate: (account) => account.workspace_id === workspaceId && !account.is_archived,
    sort: (first, second) => first.created_at.localeCompare(second.created_at),
    tableName: 'accounts',
  })
}

export async function createAccount(input: {
  currency: CurrencyCode
  name: string
  startingBalance: number
  type: AccountType
  workspaceId: string
}) {
  if (shouldQueueOfflineWrite()) {
    const now = new Date().toISOString()
    const userId = await getCurrentUserIdForOfflineWrite()
    const values = {
      workspace_id: input.workspaceId,
      name: input.name,
      type: input.type,
      starting_balance: input.startingBalance,
      current_balance: input.startingBalance,
      currency: input.currency,
      created_by: userId,
    }

    await queueTableInsert<Account>({
      record: {
        ...values,
        created_at: now,
        created_by: userId,
        id: createOfflineId(),
        is_archived: false,
        updated_at: now,
      },
      remoteValues: {
        ...values,
        created_by: userId,
      },
      tableName: 'accounts',
      workspaceId: input.workspaceId,
    })
    return
  }

  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  const values = {
    workspace_id: input.workspaceId,
    name: input.name,
    type: input.type,
    starting_balance: input.startingBalance,
    current_balance: input.startingBalance,
    currency: input.currency,
    created_by: userData.user.id,
  }

  const { error } = await supabase.from('accounts').insert(values)

  if (error) {
    throw error
  }
}

export async function updateAccount(input: {
  accountId: string
  name: string
  type: AccountType
}) {
  if (shouldQueueOfflineWrite()) {
    await queueTableUpdate({
      recordId: input.accountId,
      tableName: 'accounts',
      updates: {
        name: input.name,
        type: input.type,
      },
    })
    return
  }

  const { error } = await supabase
    .from('accounts')
    .update({
      name: input.name,
      type: input.type,
    })
    .eq('id', input.accountId)

  if (error) {
    throw error
  }
}

export async function archiveAccount(accountId: string) {
  if (shouldQueueOfflineWrite()) {
    await queueTableUpdate({
      recordId: accountId,
      tableName: 'accounts',
      updates: { is_archived: true },
    })
    return
  }

  const { error } = await supabase
    .from('accounts')
    .update({ is_archived: true })
    .eq('id', accountId)

  if (error) {
    throw error
  }
}
