import { supabase } from '../../../lib/supabase'
import type { Account, AccountType, CurrencyCode } from '../../../types/domain'

export async function listAccounts(workspaceId: string) {
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
}

export async function createAccount(input: {
  currency: CurrencyCode
  name: string
  startingBalance: number
  type: AccountType
  workspaceId: string
}) {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  const { error } = await supabase.from('accounts').insert({
    workspace_id: input.workspaceId,
    name: input.name,
    type: input.type,
    starting_balance: input.startingBalance,
    current_balance: input.startingBalance,
    currency: input.currency,
    created_by: userData.user.id,
  })

  if (error) {
    throw error
  }
}
