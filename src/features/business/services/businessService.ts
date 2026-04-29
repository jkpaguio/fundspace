import { supabase } from '../../../lib/supabase'
import type {
  Business,
  BusinessExpense,
  Product,
  ProductIngredient,
  Sale,
} from '../../../types/domain'

export async function listBusinesses(workspaceId: string) {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []) as Business[]
}

export async function createBusiness(input: {
  capitalAmount: number
  description: string
  name: string
  workspaceId: string
}) {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  const { data, error } = await supabase
    .from('businesses')
    .insert({
      workspace_id: input.workspaceId,
      name: input.name,
      description: input.description || null,
      capital_amount: input.capitalAmount,
      created_by: userData.user.id,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data as Business
}

export async function updateBusiness(input: {
  businessId: string
  capitalAmount: number
  description: string
  name: string
}) {
  const { data, error } = await supabase
    .from('businesses')
    .update({
      capital_amount: input.capitalAmount,
      description: input.description || null,
      name: input.name,
    })
    .eq('id', input.businessId)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data as Business
}

export async function listProducts(businessId: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []) as Product[]
}

export async function createProduct(input: {
  businessId: string
  description: string
  name: string
  sellingPrice: number
  unitsProduced: number
}) {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  const { data, error } = await supabase
    .from('products')
    .insert({
      business_id: input.businessId,
      name: input.name,
      description: input.description || null,
      units_produced: input.unitsProduced,
      selling_price: input.sellingPrice,
      created_by: userData.user.id,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data as Product
}

export async function updateProduct(input: {
  description: string
  name: string
  productId: string
  sellingPrice: number
  unitsProduced: number
}) {
  const { data, error } = await supabase
    .from('products')
    .update({
      description: input.description || null,
      name: input.name,
      selling_price: input.sellingPrice,
      units_produced: input.unitsProduced,
    })
    .eq('id', input.productId)
    .select()
    .single()

  if (error) {
    throw error
  }

  await supabase.rpc('recalculate_product_metrics', {
    target_product_id: input.productId,
  })

  return data as Product
}

export async function listProductIngredients(productId: string) {
  const { data, error } = await supabase
    .from('product_ingredients')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []) as ProductIngredient[]
}

export async function createProductIngredient(input: {
  name: string
  productId: string
  quantity: number
  totalCost: number
  unit: string
}) {
  const { data, error } = await supabase
    .from('product_ingredients')
    .insert({
      product_id: input.productId,
      name: input.name,
      quantity: input.quantity,
      total_cost: input.totalCost,
      unit: input.unit,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  await supabase.rpc('recalculate_product_metrics', {
    target_product_id: input.productId,
  })

  return data as ProductIngredient
}

export async function listSales(businessId: string) {
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .eq('business_id', businessId)
    .order('sale_date', { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []) as Sale[]
}

export async function listBusinessExpenses(businessId: string) {
  const { data, error } = await supabase
    .from('business_expenses')
    .select('*')
    .eq('business_id', businessId)
    .order('expense_date', { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []) as BusinessExpense[]
}

export async function createSale(input: {
  accountId: string
  businessId: string
  date: string
  notes: string
  productId: string
  quantity: number
  sellingPrice: number
}) {
  const { data, error } = await supabase.rpc('create_sale_transaction', {
    payment_account_id: input.accountId,
    sale_date: input.date,
    sale_notes: input.notes || null,
    sale_quantity: input.quantity,
    sale_selling_price: input.sellingPrice,
    target_business_id: input.businessId,
    target_product_id: input.productId,
  })

  if (error) {
    throw error
  }

  return data as Sale
}

export async function createBusinessExpense(input: {
  accountId: string
  amount: number
  businessId: string
  categoryId: string | null
  date: string
  notes: string
}) {
  const { data, error } = await supabase.rpc('create_business_expense_entry', {
    expense_amount: input.amount,
    expense_date: input.date,
    expense_notes: input.notes || null,
    payment_account_id: input.accountId,
    target_business_id: input.businessId,
    target_category_id: input.categoryId,
  })

  if (error) {
    throw error
  }

  return data as BusinessExpense
}
