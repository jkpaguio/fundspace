import { supabase } from '../../../lib/supabase'
import type { SavingsBucket } from '../../../types/domain'

export async function listSavingsBuckets(workspaceId: string) {
  const { data, error } = await supabase
    .from('savings_buckets')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_archived', false)
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []) as SavingsBucket[]
}

export async function createSavingsBucket(input: {
  allocationPercentage: number
  linkedAccountId: string | null
  name: string
  targetAmount: number
  targetDate: string | null
  workspaceId: string
}) {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  const { error } = await supabase.from('savings_buckets').insert({
    workspace_id: input.workspaceId,
    linked_account_id: input.linkedAccountId,
    name: input.name,
    target_amount: input.targetAmount,
    allocation_percentage: input.allocationPercentage,
    target_date: input.targetDate,
    created_by: userData.user.id,
  })

  if (error) {
    throw error
  }
}

export async function createSavingsAllocation(input: {
  amount: number
  bucketId: string
  date: string
  notes: string
  sourceAccountId: string
  workspaceId: string
}) {
  const { error } = await supabase.rpc('create_savings_allocation', {
    allocation_amount: input.amount,
    allocation_date: input.date,
    allocation_notes: input.notes || null,
    source_account_id: input.sourceAccountId,
    target_bucket_id: input.bucketId,
    target_workspace_id: input.workspaceId,
  })

  if (error) {
    throw error
  }
}

export async function updateSavingsBucket(input: {
  allocationPercentage: number
  bucketId: string
  linkedAccountId: string | null
  name: string
  targetAmount: number
  targetDate: string | null
}) {
  const { error } = await supabase
    .from('savings_buckets')
    .update({
      allocation_percentage: input.allocationPercentage,
      linked_account_id: input.linkedAccountId,
      name: input.name,
      target_amount: input.targetAmount,
      target_date: input.targetDate,
    })
    .eq('id', input.bucketId)

  if (error) {
    throw error
  }
}

export async function archiveSavingsBucket(bucketId: string) {
  const { error } = await supabase
    .from('savings_buckets')
    .update({ is_archived: true })
    .eq('id', bucketId)

  if (error) {
    throw error
  }
}
