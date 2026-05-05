import { supabase } from '../../../lib/supabase'
import {
  createOfflineId,
  getCurrentUserIdForOfflineWrite,
  queueRpc,
  queueTableInsert,
  queueTableUpdate,
  readThroughCache,
  shouldQueueOfflineWrite,
} from '../../../lib/offline'
import type {
  Business,
  BusinessExpense,
  Product,
  ProductIngredient,
  Sale,
} from '../../../types/domain'

export async function listBusinesses(workspaceId: string) {
  return readThroughCache<Business>({
    fetchRemote: async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      return (data ?? []) as Business[]
    },
    predicate: (business) => business.workspace_id === workspaceId,
    sort: (first, second) => first.created_at.localeCompare(second.created_at),
    tableName: 'businesses',
  })
}

export async function createBusiness(input: {
  capitalAmount: number
  description: string
  name: string
  workspaceId: string
}) {
  if (shouldQueueOfflineWrite()) {
    const now = new Date().toISOString()
    const userId = await getCurrentUserIdForOfflineWrite()
    const values = {
      workspace_id: input.workspaceId,
      name: input.name,
      description: input.description || null,
      capital_amount: input.capitalAmount,
      created_by: userId,
    }

    return queueTableInsert<Business>({
      record: {
        ...values,
        created_at: now,
        id: createOfflineId(),
        logo_url: null,
        updated_at: now,
      },
      remoteValues: values,
      tableName: 'businesses',
      workspaceId: input.workspaceId,
    }) as Promise<Business>
  }

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
  if (shouldQueueOfflineWrite()) {
    const updates = {
      capital_amount: input.capitalAmount,
      description: input.description || null,
      name: input.name,
    }

    await queueTableUpdate({
      recordId: input.businessId,
      tableName: 'businesses',
      updates,
    })

    return {
      ...updates,
      created_at: new Date().toISOString(),
      created_by: '',
      id: input.businessId,
      logo_url: null,
      updated_at: new Date().toISOString(),
      workspace_id: '',
    } as Business
  }

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
  return readThroughCache<Product>({
    fetchRemote: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      return (data ?? []) as Product[]
    },
    predicate: (product) => product.business_id === businessId,
    sort: (first, second) => first.created_at.localeCompare(second.created_at),
    tableName: 'products',
  })
}

export async function createProduct(input: {
  businessId: string
  description: string
  name: string
  sellingPrice: number
  unitsProduced: number
}) {
  if (shouldQueueOfflineWrite()) {
    const now = new Date().toISOString()
    const userId = await getCurrentUserIdForOfflineWrite()
    const values = {
      business_id: input.businessId,
      name: input.name,
      description: input.description || null,
      units_produced: input.unitsProduced,
      selling_price: input.sellingPrice,
      created_by: userId,
    }

    return queueTableInsert<Product>({
      record: {
        ...values,
        cost_per_unit: 0,
        created_at: now,
        id: createOfflineId(),
        is_active: true,
        profit_margin: 0,
        profit_per_unit: input.sellingPrice,
        updated_at: now,
      },
      remoteValues: values,
      tableName: 'products',
    }) as Promise<Product>
  }

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
  if (shouldQueueOfflineWrite()) {
    const updates = {
      description: input.description || null,
      name: input.name,
      selling_price: input.sellingPrice,
      units_produced: input.unitsProduced,
    }

    await queueTableUpdate({
      recordId: input.productId,
      tableName: 'products',
      updates,
    })

    return {
      ...updates,
      business_id: '',
      cost_per_unit: 0,
      created_at: new Date().toISOString(),
      created_by: '',
      id: input.productId,
      is_active: true,
      profit_margin: 0,
      profit_per_unit: input.sellingPrice,
      updated_at: new Date().toISOString(),
    } as Product
  }

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
  return readThroughCache<ProductIngredient>({
    fetchRemote: async () => {
      const { data, error } = await supabase
        .from('product_ingredients')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      return (data ?? []) as ProductIngredient[]
    },
    predicate: (ingredient) => ingredient.product_id === productId,
    sort: (first, second) => first.created_at.localeCompare(second.created_at),
    tableName: 'product_ingredients',
  })
}

export async function createProductIngredient(input: {
  name: string
  productId: string
  quantity: number
  totalCost: number
  unit: string
}) {
  if (shouldQueueOfflineWrite()) {
    const now = new Date().toISOString()
    const values = {
      product_id: input.productId,
      name: input.name,
      quantity: input.quantity,
      total_cost: input.totalCost,
      unit: input.unit,
    }

    return queueTableInsert<ProductIngredient>({
      record: {
        ...values,
        created_at: now,
        id: createOfflineId(),
        updated_at: now,
      },
      remoteValues: values,
      tableName: 'product_ingredients',
    }) as Promise<ProductIngredient>
  }

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
  return readThroughCache<Sale>({
    fetchRemote: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('business_id', businessId)
        .order('sale_date', { ascending: false })

      if (error) {
        throw error
      }

      return (data ?? []) as Sale[]
    },
    predicate: (sale) => sale.business_id === businessId,
    sort: (first, second) => second.sale_date.localeCompare(first.sale_date),
    tableName: 'sales',
  })
}

export async function listBusinessExpenses(businessId: string) {
  return readThroughCache<BusinessExpense>({
    fetchRemote: async () => {
      const { data, error } = await supabase
        .from('business_expenses')
        .select('*')
        .eq('business_id', businessId)
        .order('expense_date', { ascending: false })

      if (error) {
        throw error
      }

      return (data ?? []) as BusinessExpense[]
    },
    predicate: (expense) => expense.business_id === businessId,
    sort: (first, second) => second.expense_date.localeCompare(first.expense_date),
    tableName: 'business_expenses',
  })
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
  if (shouldQueueOfflineWrite()) {
    await queueRpc({
      args: {
        payment_account_id: input.accountId,
        sale_date: input.date,
        sale_notes: input.notes || null,
        sale_quantity: input.quantity,
        sale_selling_price: input.sellingPrice,
        target_business_id: input.businessId,
        target_product_id: input.productId,
      },
      rpcName: 'create_sale_transaction',
      tableName: 'sales',
    })

    return {
      business_id: input.businessId,
      cogs: 0,
      cost_per_unit: 0,
      created_at: new Date().toISOString(),
      created_by: '',
      gross_profit: 0,
      id: createOfflineId(),
      notes: input.notes || null,
      product_id: input.productId,
      quantity: input.quantity,
      revenue: input.quantity * input.sellingPrice,
      sale_date: input.date,
      selling_price: input.sellingPrice,
      transaction_id: '',
      updated_at: new Date().toISOString(),
    } as Sale
  }

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
  if (shouldQueueOfflineWrite()) {
    await queueRpc({
      args: {
        expense_amount: input.amount,
        expense_date: input.date,
        expense_notes: input.notes || null,
        payment_account_id: input.accountId,
        target_business_id: input.businessId,
        target_category_id: input.categoryId,
      },
      rpcName: 'create_business_expense_entry',
      tableName: 'business_expenses',
    })

    return {
      amount: input.amount,
      business_id: input.businessId,
      category_id: input.categoryId,
      created_at: new Date().toISOString(),
      created_by: '',
      expense_date: input.date,
      id: createOfflineId(),
      notes: input.notes || null,
      transaction_id: '',
      updated_at: new Date().toISOString(),
    } as BusinessExpense
  }

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
