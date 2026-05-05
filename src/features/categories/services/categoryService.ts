import { supabase } from '../../../lib/supabase'
import {
  createOfflineId,
  queueTableInsert,
  queueTableUpdate,
  readThroughCache,
  shouldQueueOfflineWrite,
} from '../../../lib/offline'
import type { Category, CategoryType } from '../../../types/domain'

export async function listCategories(workspaceId: string) {
  return readThroughCache<Category>({
    fetchRemote: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
        .eq('is_archived', false)
        .order('type', { ascending: true })
        .order('name', { ascending: true })

      if (error) {
        throw error
      }

      return (data ?? []) as Category[]
    },
    predicate: (category) =>
      !category.is_archived && (category.workspace_id === null || category.workspace_id === workspaceId),
    sort: (first, second) =>
      first.type.localeCompare(second.type) || first.name.localeCompare(second.name),
    stalePredicate: (category) => category.workspace_id === null || category.workspace_id === workspaceId,
    tableName: 'categories',
  })
}

export async function createCategory(input: {
  color: string
  name: string
  type: CategoryType
  workspaceId: string
}) {
  const values = {
    workspace_id: input.workspaceId,
    name: input.name,
    type: input.type,
    color: input.color,
    is_default: false,
  }

  if (shouldQueueOfflineWrite()) {
    const now = new Date().toISOString()

    await queueTableInsert<Category>({
      record: {
        ...values,
        created_at: now,
        icon: null,
        id: createOfflineId(),
        is_archived: false,
        updated_at: now,
      },
      remoteValues: values,
      tableName: 'categories',
      workspaceId: input.workspaceId,
    })
    return
  }

  const { error } = await supabase.from('categories').insert(values)

  if (error) {
    throw error
  }
}

export async function updateCategory(input: {
  categoryId: string
  color: string
  name: string
  type: CategoryType
}) {
  if (shouldQueueOfflineWrite()) {
    await queueTableUpdate({
      recordId: input.categoryId,
      tableName: 'categories',
      updates: {
        color: input.color,
        name: input.name,
        type: input.type,
      },
    })
    return
  }

  const { error } = await supabase
    .from('categories')
    .update({
      color: input.color,
      name: input.name,
      type: input.type,
    })
    .eq('id', input.categoryId)
    .eq('is_default', false)

  if (error) {
    throw error
  }
}

export async function archiveCategory(categoryId: string) {
  if (shouldQueueOfflineWrite()) {
    await queueTableUpdate({
      recordId: categoryId,
      tableName: 'categories',
      updates: { is_archived: true },
    })
    return
  }

  const { error } = await supabase
    .from('categories')
    .update({ is_archived: true })
    .eq('id', categoryId)
    .eq('is_default', false)

  if (error) {
    throw error
  }
}
