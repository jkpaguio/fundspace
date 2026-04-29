import { supabase } from '../../../lib/supabase'
import type { Category, CategoryType } from '../../../types/domain'

export async function listCategories(workspaceId: string) {
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
}

export async function createCategory(input: {
  color: string
  name: string
  type: CategoryType
  workspaceId: string
}) {
  const { error } = await supabase.from('categories').insert({
    workspace_id: input.workspaceId,
    name: input.name,
    type: input.type,
    color: input.color,
    is_default: false,
  })

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
  const { error } = await supabase
    .from('categories')
    .update({ is_archived: true })
    .eq('id', categoryId)
    .eq('is_default', false)

  if (error) {
    throw error
  }
}
