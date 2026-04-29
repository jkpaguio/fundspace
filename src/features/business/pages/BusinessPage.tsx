import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Calculator, Package, Plus, ReceiptText, Store } from 'lucide-react'
import { EmptyState } from '../../../components/common/EmptyState'
import { PageHeader } from '../../../components/common/PageHeader'
import { Button, Card, CardContent, CardHeader, Input } from '../../../components/ui'
import {
  calculateCOGS,
  calculateGrossProfit,
  calculateNetProfit,
  calculateProfitMargin,
  calculateROI,
  calculateRevenue,
  calculateTotalCost,
} from '../../../lib/calculations'
import { formatCurrency } from '../../../lib/formatCurrency'
import { useWorkspaceOutlet } from '../../../hooks/useWorkspaceOutlet'
import type { Account, Business, BusinessExpense, Category, Product, ProductIngredient, Sale } from '../../../types/domain'
import { createActivityLog } from '../../activity/services/activityService'
import { listAccounts } from '../../accounts/services/accountService'
import { listCategories } from '../../categories/services/categoryService'
import {
  createBusiness,
  createBusinessExpense,
  createProduct,
  createProductIngredient,
  createSale,
  listBusinessExpenses,
  listBusinesses,
  listProductIngredients,
  listProducts,
  listSales,
  updateBusiness,
  updateProduct,
} from '../services/businessService'

const today = new Date().toISOString().slice(0, 10)

type BusinessEditDraft = {
  businessId: string
  capitalAmount: string
  description: string
  name: string
}

type ProductEditDraft = {
  description: string
  name: string
  productId: string
  sellingPrice: string
  unitsProduced: string
}

export function BusinessPage() {
  const { selectedWorkspace } = useWorkspaceOutlet()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [ingredients, setIngredients] = useState<ProductIngredient[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [expenses, setExpenses] = useState<BusinessExpense[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [businessDescription, setBusinessDescription] = useState('')
  const [capitalAmount, setCapitalAmount] = useState('0')
  const [productName, setProductName] = useState('')
  const [productDescription, setProductDescription] = useState('')
  const [unitsProduced, setUnitsProduced] = useState('1')
  const [sellingPrice, setSellingPrice] = useState('0')
  const [ingredientName, setIngredientName] = useState('')
  const [ingredientQuantity, setIngredientQuantity] = useState('1')
  const [ingredientUnit, setIngredientUnit] = useState('pcs')
  const [ingredientCost, setIngredientCost] = useState('0')
  const [saleAccountId, setSaleAccountId] = useState('')
  const [saleQuantity, setSaleQuantity] = useState('1')
  const [salePrice, setSalePrice] = useState('0')
  const [saleDate, setSaleDate] = useState(today)
  const [saleNotes, setSaleNotes] = useState('')
  const [expenseAccountId, setExpenseAccountId] = useState('')
  const [expenseCategoryId, setExpenseCategoryId] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState(today)
  const [expenseNotes, setExpenseNotes] = useState('')
  const [roiRevenue, setRoiRevenue] = useState('0')
  const [roiCosts, setRoiCosts] = useState('0')
  const [roiExpenses, setRoiExpenses] = useState('0')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [businessEditDraft, setBusinessEditDraft] = useState<BusinessEditDraft | null>(null)
  const [productEditDraft, setProductEditDraft] = useState<ProductEditDraft | null>(null)
  const [isSavingBusiness, setIsSavingBusiness] = useState(false)
  const [isSavingProduct, setIsSavingProduct] = useState(false)

  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? null
  const selectedBusiness = businesses.find((business) => business.id === selectedBusinessId) ?? null
  const businessExpenseCategories = useMemo(
    () => categories.filter((category) => category.type === 'business_expense' || category.type === 'expense'),
    [categories],
  )

  const loadPageData = useCallback(async () => {
    if (!selectedWorkspace) {
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const [nextAccounts, nextCategories, nextBusinesses] = await Promise.all([
        listAccounts(selectedWorkspace.id),
        listCategories(selectedWorkspace.id),
        listBusinesses(selectedWorkspace.id),
      ])

      setAccounts(nextAccounts)
      setCategories(nextCategories)
      setBusinesses(nextBusinesses)

      const activeBusinessId = nextBusinesses.find((business) => business.id === selectedBusinessId)?.id
        ?? nextBusinesses[0]?.id
        ?? ''
      setSelectedBusinessId(activeBusinessId)

      if (!saleAccountId && nextAccounts[0]) {
        setSaleAccountId(nextAccounts[0].id)
      }

      if (!expenseAccountId && nextAccounts[0]) {
        setExpenseAccountId(nextAccounts[0].id)
      }

      if (!expenseCategoryId) {
        const defaultExpenseCategory = nextCategories.find(
          (category) => category.type === 'business_expense' || category.type === 'expense',
        )

        if (defaultExpenseCategory) {
          setExpenseCategoryId(defaultExpenseCategory.id)
        }
      }

      if (activeBusinessId) {
        const [nextProducts, nextSales, nextExpenses] = await Promise.all([
          listProducts(activeBusinessId),
          listSales(activeBusinessId),
          listBusinessExpenses(activeBusinessId),
        ])

        setProducts(nextProducts)
        setSales(nextSales)
        setExpenses(nextExpenses)

        const activeProductId =
          nextProducts.find((product) => product.id === selectedProductId)?.id ?? nextProducts[0]?.id ?? ''
        setSelectedProductId(activeProductId)

        if (activeProductId) {
          setIngredients(await listProductIngredients(activeProductId))
        } else {
          setIngredients([])
        }
      } else {
        setProducts([])
        setIngredients([])
        setSales([])
        setExpenses([])
        setSelectedProductId('')
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load business data.')
    } finally {
      setIsLoading(false)
    }
  }, [expenseAccountId, expenseCategoryId, saleAccountId, selectedBusinessId, selectedProductId, selectedWorkspace])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPageData()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadPageData])

  const handleCreateBusiness = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedWorkspace) return
    setIsSubmitting(true)
    setError('')
    try {
      const business = await createBusiness({
        capitalAmount: Number(capitalAmount),
        description: businessDescription,
        name: businessName,
        workspaceId: selectedWorkspace.id,
      })
      await createActivityLog({
        action: 'created_business',
        description: 'Created a business profile',
        entityId: business.id,
        entityType: 'business',
        workspaceId: selectedWorkspace.id,
      })
      setBusinessName('')
      setBusinessDescription('')
      setCapitalAmount('0')
      await loadPageData()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create business.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedBusinessId || !selectedWorkspace) return
    setIsSubmitting(true)
    setError('')
    try {
      const product = await createProduct({
        businessId: selectedBusinessId,
        description: productDescription,
        name: productName,
        sellingPrice: Number(sellingPrice),
        unitsProduced: Number(unitsProduced),
      })
      await createActivityLog({
        action: 'created_product',
        description: 'Created a product costing profile',
        entityId: product.id,
        entityType: 'product',
        workspaceId: selectedWorkspace.id,
      })
      setProductName('')
      setProductDescription('')
      setUnitsProduced('1')
      setSellingPrice('0')
      await loadPageData()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create product.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateIngredient = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedProductId || !selectedWorkspace) return
    setIsSubmitting(true)
    setError('')
    try {
      const ingredient = await createProductIngredient({
        name: ingredientName,
        productId: selectedProductId,
        quantity: Number(ingredientQuantity),
        totalCost: Number(ingredientCost),
        unit: ingredientUnit,
      })
      await createActivityLog({
        action: 'created_product_ingredient',
        description: 'Added a product ingredient cost',
        entityId: ingredient.id,
        entityType: 'product_ingredient',
        workspaceId: selectedWorkspace.id,
      })
      setIngredientName('')
      setIngredientQuantity('1')
      setIngredientCost('0')
      await loadPageData()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to add ingredient.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateSale = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedBusinessId || !selectedProductId) return
    setIsSubmitting(true)
    setError('')
    try {
      await createSale({
        accountId: saleAccountId,
        businessId: selectedBusinessId,
        date: saleDate,
        notes: saleNotes,
        productId: selectedProductId,
        quantity: Number(saleQuantity),
        sellingPrice: Number(salePrice),
      })
      setSaleQuantity('1')
      setSalePrice(selectedProduct?.selling_price.toString() ?? '0')
      setSaleNotes('')
      await loadPageData()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to record sale.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateExpense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedBusinessId) return
    setIsSubmitting(true)
    setError('')
    try {
      await createBusinessExpense({
        accountId: expenseAccountId,
        amount: Number(expenseAmount),
        businessId: selectedBusinessId,
        categoryId: expenseCategoryId || null,
        date: expenseDate,
        notes: expenseNotes,
      })
      setExpenseAmount('')
      setExpenseNotes('')
      await loadPageData()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to record expense.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveBusiness = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!businessEditDraft || !selectedWorkspace) return
    setIsSavingBusiness(true)
    setError('')
    try {
      const business = await updateBusiness({
        businessId: businessEditDraft.businessId,
        capitalAmount: Number(businessEditDraft.capitalAmount || 0),
        description: businessEditDraft.description,
        name: businessEditDraft.name,
      })
      await createActivityLog({
        action: 'updated_business',
        description: 'Updated a business profile',
        entityId: business.id,
        entityType: 'business',
        workspaceId: selectedWorkspace.id,
      })
      setBusinessEditDraft(null)
      await loadPageData()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update business.')
    } finally {
      setIsSavingBusiness(false)
    }
  }

  const handleSaveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!productEditDraft || !selectedWorkspace) return
    setIsSavingProduct(true)
    setError('')
    try {
      const product = await updateProduct({
        description: productEditDraft.description,
        name: productEditDraft.name,
        productId: productEditDraft.productId,
        sellingPrice: Number(productEditDraft.sellingPrice || 0),
        unitsProduced: Number(productEditDraft.unitsProduced || 0),
      })
      await createActivityLog({
        action: 'updated_product',
        description: 'Updated a product costing profile',
        entityId: product.id,
        entityType: 'product',
        workspaceId: selectedWorkspace.id,
      })
      setProductEditDraft(null)
      await loadPageData()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update product.')
    } finally {
      setIsSavingProduct(false)
    }
  }

  const ingredientTotalCost = calculateTotalCost(ingredients)
  const previewRevenue = selectedProduct ? calculateRevenue(Number(salePrice || 0), Number(saleQuantity || 0)) : 0
  const previewCogs = selectedProduct ? calculateCOGS(selectedProduct.cost_per_unit, Number(saleQuantity || 0)) : 0
  const previewGrossProfit = calculateGrossProfit(previewRevenue, previewCogs)
  const grossProfitTotal = sales.reduce((total, sale) => total + sale.gross_profit, 0)
  const expenseTotal = expenses.reduce((total, expense) => total + expense.amount, 0)
  const netProfit = calculateNetProfit(grossProfitTotal, expenseTotal)
  const roiPreview = calculateROI(Number(roiRevenue) - Number(roiCosts) - Number(roiExpenses), selectedBusiness?.capital_amount ?? 0)

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Business module"
        heading="Costing and operations"
        lead="Build product costing, encode sales and business expenses, and review profit and ROI from the same business space."
      />

      {error && <p className="form-error">{error}</p>}

      {!selectedWorkspace ? (
        <EmptyState
          description="Switch to a Business or Side hustle space before opening costing, sales, and operations tools."
          title="Business tools need a business space"
        />
      ) : (
        <>
          <section className="content-grid">
            <Card>
              <CardHeader>
                <Store aria-hidden="true" size={20} />
                <h2>Business profile</h2>
              </CardHeader>
              <CardContent>
                <form className="stack-form" onSubmit={handleCreateBusiness}>
                  <label className="field-group">
                    Name
                    <Input onChange={(event) => setBusinessName(event.target.value)} required value={businessName} />
                  </label>
                  <label className="field-group">
                    Description
                    <Input onChange={(event) => setBusinessDescription(event.target.value)} value={businessDescription} />
                  </label>
                  <label className="field-group">
                    Capital amount
                    <Input min="0" onChange={(event) => setCapitalAmount(event.target.value)} step="0.01" type="number" value={capitalAmount} />
                  </label>
                  <Button disabled={isSubmitting} type="submit">
                    <Plus aria-hidden="true" size={18} />
                    {isSubmitting ? 'Saving...' : 'Create business'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Package aria-hidden="true" size={20} />
                <h2>Product costing</h2>
              </CardHeader>
              <CardContent>
                <form className="stack-form" onSubmit={handleCreateProduct}>
                  <label className="field-group">
                    Business
                    <select className="field-input" onChange={(event) => setSelectedBusinessId(event.target.value)} value={selectedBusinessId}>
                      {businesses.map((business) => (
                        <option key={business.id} value={business.id}>
                          {business.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field-group">
                    Product name
                    <Input onChange={(event) => setProductName(event.target.value)} required value={productName} />
                  </label>
                  <label className="field-group">
                    Description
                    <Input onChange={(event) => setProductDescription(event.target.value)} value={productDescription} />
                  </label>
                  <label className="field-group">
                    Units produced
                    <Input min="0.01" onChange={(event) => setUnitsProduced(event.target.value)} required step="0.01" type="number" value={unitsProduced} />
                  </label>
                  <label className="field-group">
                    Selling price
                    <Input min="0" onChange={(event) => setSellingPrice(event.target.value)} required step="0.01" type="number" value={sellingPrice} />
                  </label>
                  <Button disabled={isSubmitting || !selectedBusinessId} type="submit">
                    <Plus aria-hidden="true" size={18} />
                    {isSubmitting ? 'Saving...' : 'Create product'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </section>

          <section className="content-grid">
            <Card>
              <CardHeader>
                <Store aria-hidden="true" size={20} />
                <h2>Edit business profile</h2>
              </CardHeader>
              <CardContent>
                {!selectedBusiness ? (
                  <p className="empty-state">Create or select a business profile before editing.</p>
                ) : (
                  <form className="stack-form" onSubmit={handleSaveBusiness}>
                    <label className="field-group">
                      Business
                      <select
                        className="field-input"
                        onChange={(event) => {
                          const business = businesses.find((item) => item.id === event.target.value) ?? null
                          setSelectedBusinessId(event.target.value)
                          setBusinessEditDraft(
                            business
                              ? {
                                  businessId: business.id,
                                  capitalAmount: String(business.capital_amount),
                                  description: business.description ?? '',
                                  name: business.name,
                                }
                              : null,
                          )
                        }}
                        value={businessEditDraft?.businessId ?? selectedBusinessId}
                      >
                        {businesses.map((business) => (
                          <option key={business.id} value={business.id}>
                            {business.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field-group">
                      Name
                      <Input
                        onChange={(event) =>
                          setBusinessEditDraft({
                            businessId: selectedBusiness.id,
                            capitalAmount:
                              businessEditDraft?.capitalAmount ?? String(selectedBusiness.capital_amount),
                            description: businessEditDraft?.description ?? selectedBusiness.description ?? '',
                            name: event.target.value,
                          })
                        }
                        required
                        value={businessEditDraft?.name ?? selectedBusiness.name}
                      />
                    </label>
                    <label className="field-group">
                      Description
                      <Input
                        onChange={(event) =>
                          setBusinessEditDraft({
                            businessId: selectedBusiness.id,
                            capitalAmount:
                              businessEditDraft?.capitalAmount ?? String(selectedBusiness.capital_amount),
                            description: event.target.value,
                            name: businessEditDraft?.name ?? selectedBusiness.name,
                          })
                        }
                        value={businessEditDraft?.description ?? selectedBusiness.description ?? ''}
                      />
                    </label>
                    <label className="field-group">
                      Capital amount
                      <Input
                        min="0"
                        onChange={(event) =>
                          setBusinessEditDraft({
                            businessId: selectedBusiness.id,
                            capitalAmount: event.target.value,
                            description: businessEditDraft?.description ?? selectedBusiness.description ?? '',
                            name: businessEditDraft?.name ?? selectedBusiness.name,
                          })
                        }
                        step="0.01"
                        type="number"
                        value={businessEditDraft?.capitalAmount ?? String(selectedBusiness.capital_amount)}
                      />
                    </label>
                    <Button disabled={isSavingBusiness} type="submit">
                      <Store aria-hidden="true" size={18} />
                      {isSavingBusiness ? 'Saving...' : 'Save business profile'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Package aria-hidden="true" size={20} />
                <h2>Edit product</h2>
              </CardHeader>
              <CardContent>
                {!selectedProduct ? (
                  <p className="empty-state">Create or select a product before editing.</p>
                ) : (
                  <form className="stack-form" onSubmit={handleSaveProduct}>
                    <label className="field-group">
                      Product
                      <select
                        className="field-input"
                        onChange={(event) => {
                          const product = products.find((item) => item.id === event.target.value) ?? null
                          setSelectedProductId(event.target.value)
                          setProductEditDraft(
                            product
                              ? {
                                  description: product.description ?? '',
                                  name: product.name,
                                  productId: product.id,
                                  sellingPrice: String(product.selling_price),
                                  unitsProduced: String(product.units_produced),
                                }
                              : null,
                          )
                        }}
                        value={productEditDraft?.productId ?? selectedProductId}
                      >
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field-group">
                      Product name
                      <Input
                        onChange={(event) =>
                          setProductEditDraft({
                            description: productEditDraft?.description ?? selectedProduct.description ?? '',
                            name: event.target.value,
                            productId: selectedProduct.id,
                            sellingPrice: productEditDraft?.sellingPrice ?? String(selectedProduct.selling_price),
                            unitsProduced: productEditDraft?.unitsProduced ?? String(selectedProduct.units_produced),
                          })
                        }
                        required
                        value={productEditDraft?.name ?? selectedProduct.name}
                      />
                    </label>
                    <label className="field-group">
                      Description
                      <Input
                        onChange={(event) =>
                          setProductEditDraft({
                            description: event.target.value,
                            name: productEditDraft?.name ?? selectedProduct.name,
                            productId: selectedProduct.id,
                            sellingPrice: productEditDraft?.sellingPrice ?? String(selectedProduct.selling_price),
                            unitsProduced: productEditDraft?.unitsProduced ?? String(selectedProduct.units_produced),
                          })
                        }
                        value={productEditDraft?.description ?? selectedProduct.description ?? ''}
                      />
                    </label>
                    <label className="field-group">
                      Units produced
                      <Input
                        min="0.01"
                        onChange={(event) =>
                          setProductEditDraft({
                            description: productEditDraft?.description ?? selectedProduct.description ?? '',
                            name: productEditDraft?.name ?? selectedProduct.name,
                            productId: selectedProduct.id,
                            sellingPrice: productEditDraft?.sellingPrice ?? String(selectedProduct.selling_price),
                            unitsProduced: event.target.value,
                          })
                        }
                        required
                        step="0.01"
                        type="number"
                        value={productEditDraft?.unitsProduced ?? String(selectedProduct.units_produced)}
                      />
                    </label>
                    <label className="field-group">
                      Selling price
                      <Input
                        min="0"
                        onChange={(event) =>
                          setProductEditDraft({
                            description: productEditDraft?.description ?? selectedProduct.description ?? '',
                            name: productEditDraft?.name ?? selectedProduct.name,
                            productId: selectedProduct.id,
                            sellingPrice: event.target.value,
                            unitsProduced: productEditDraft?.unitsProduced ?? String(selectedProduct.units_produced),
                          })
                        }
                        required
                        step="0.01"
                        type="number"
                        value={productEditDraft?.sellingPrice ?? String(selectedProduct.selling_price)}
                      />
                    </label>
                    <Button disabled={isSavingProduct} type="submit">
                      <Package aria-hidden="true" size={18} />
                      {isSavingProduct ? 'Saving...' : 'Save product'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="content-grid">
            <Card>
              <CardHeader>
                <Calculator aria-hidden="true" size={20} />
                <h2>Ingredient form</h2>
              </CardHeader>
              <CardContent>
                <form className="stack-form" onSubmit={handleCreateIngredient}>
                  <label className="field-group">
                    Product
                    <select className="field-input" onChange={(event) => setSelectedProductId(event.target.value)} value={selectedProductId}>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field-group">
                    Ingredient
                    <Input onChange={(event) => setIngredientName(event.target.value)} required value={ingredientName} />
                  </label>
                  <label className="field-group">
                    Quantity
                    <Input min="0.01" onChange={(event) => setIngredientQuantity(event.target.value)} required step="0.01" type="number" value={ingredientQuantity} />
                  </label>
                  <label className="field-group">
                    Unit
                    <Input onChange={(event) => setIngredientUnit(event.target.value)} required value={ingredientUnit} />
                  </label>
                  <label className="field-group">
                    Total cost
                    <Input min="0" onChange={(event) => setIngredientCost(event.target.value)} required step="0.01" type="number" value={ingredientCost} />
                  </label>
                  <Button disabled={isSubmitting || !selectedProductId} type="submit">
                    <Plus aria-hidden="true" size={18} />
                    {isSubmitting ? 'Saving...' : 'Add ingredient'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <section className="list-panel">
              <div className="section-heading">
                <h2>Cost summary</h2>
                <span>{isLoading ? 'Loading' : `${ingredients.length} ingredients`}</span>
              </div>
              <div className="record-list">
                <div className="record-row">
                  <span>
                    <strong>Total ingredient cost</strong>
                    <small>Current product</small>
                  </span>
                  <span>{selectedWorkspace ? formatCurrency(ingredientTotalCost, selectedWorkspace.currency) : ingredientTotalCost.toFixed(2)}</span>
                </div>
                {selectedProduct && (
                  <>
                    <div className="record-row">
                      <span>
                        <strong>Cost per unit</strong>
                        <small>Saved product metric</small>
                      </span>
                      <span>{formatCurrency(selectedProduct.cost_per_unit, selectedWorkspace.currency)}</span>
                    </div>
                    <div className="record-row">
                      <span>
                        <strong>Profit margin</strong>
                        <small>{formatCurrency(selectedProduct.profit_per_unit, selectedWorkspace.currency)} profit per unit</small>
                      </span>
                      <span>{selectedProduct.profit_margin.toFixed(2)}%</span>
                    </div>
                  </>
                )}
              </div>
            </section>
          </section>

          <section className="content-grid">
            <Card>
              <CardHeader>
                <ReceiptText aria-hidden="true" size={20} />
                <h2>Sale encoding</h2>
              </CardHeader>
              <CardContent>
                <form className="stack-form" onSubmit={handleCreateSale}>
                  <label className="field-group">
                    Account
                    <select className="field-input" onChange={(event) => setSaleAccountId(event.target.value)} value={saleAccountId}>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field-group">
                    Product
                    <select
                      className="field-input"
                      onChange={(event) => {
                        const nextProduct = products.find((product) => product.id === event.target.value) ?? null
                        setSelectedProductId(event.target.value)
                        setSalePrice(nextProduct?.selling_price.toString() ?? '0')
                      }}
                      value={selectedProductId}
                    >
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field-group">
                    Quantity
                    <Input min="0.01" onChange={(event) => setSaleQuantity(event.target.value)} required step="0.01" type="number" value={saleQuantity} />
                  </label>
                  <label className="field-group">
                    Selling price
                    <Input min="0" onChange={(event) => setSalePrice(event.target.value)} required step="0.01" type="number" value={salePrice} />
                  </label>
                  <label className="field-group">
                    Sale date
                    <Input onChange={(event) => setSaleDate(event.target.value)} required type="date" value={saleDate} />
                  </label>
                  <label className="field-group">
                    Notes
                    <Input onChange={(event) => setSaleNotes(event.target.value)} value={saleNotes} />
                  </label>
                  <Button disabled={isSubmitting || !selectedBusinessId || !selectedProductId} type="submit">
                    <ReceiptText aria-hidden="true" size={18} />
                    {isSubmitting ? 'Saving...' : 'Record sale'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Store aria-hidden="true" size={20} />
                <h2>Business expense</h2>
              </CardHeader>
              <CardContent>
                <form className="stack-form" onSubmit={handleCreateExpense}>
                  <label className="field-group">
                    Account
                    <select className="field-input" onChange={(event) => setExpenseAccountId(event.target.value)} value={expenseAccountId}>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field-group">
                    Category
                    <select className="field-input" onChange={(event) => setExpenseCategoryId(event.target.value)} value={expenseCategoryId}>
                      {businessExpenseCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field-group">
                    Amount
                    <Input min="0.01" onChange={(event) => setExpenseAmount(event.target.value)} required step="0.01" type="number" value={expenseAmount} />
                  </label>
                  <label className="field-group">
                    Expense date
                    <Input onChange={(event) => setExpenseDate(event.target.value)} required type="date" value={expenseDate} />
                  </label>
                  <label className="field-group">
                    Notes
                    <Input onChange={(event) => setExpenseNotes(event.target.value)} value={expenseNotes} />
                  </label>
                  <Button disabled={isSubmitting || !selectedBusinessId} type="submit">
                    <Store aria-hidden="true" size={18} />
                    {isSubmitting ? 'Saving...' : 'Record expense'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </section>

          <section className="content-grid">
            <section className="list-panel">
              <div className="section-heading">
                <h2>P&amp;L snapshot</h2>
                <span>{selectedBusiness?.name ?? 'No business selected'}</span>
              </div>
              <div className="record-list">
                <div className="record-row">
                  <span>
                    <strong>Revenue</strong>
                    <small>{sales.length} sales</small>
                  </span>
                  <span>{formatCurrency(sales.reduce((total, sale) => total + sale.revenue, 0), selectedWorkspace.currency)}</span>
                </div>
                <div className="record-row">
                  <span>
                    <strong>COGS</strong>
                    <small>Cost of goods sold</small>
                  </span>
                  <span>{formatCurrency(sales.reduce((total, sale) => total + sale.cogs, 0), selectedWorkspace.currency)}</span>
                </div>
                <div className="record-row">
                  <span>
                    <strong>Gross profit</strong>
                    <small>Revenue minus COGS</small>
                  </span>
                  <span>{formatCurrency(grossProfitTotal, selectedWorkspace.currency)}</span>
                </div>
                <div className="record-row">
                  <span>
                    <strong>Business expenses</strong>
                    <small>{expenses.length} records</small>
                  </span>
                  <span>{formatCurrency(expenseTotal, selectedWorkspace.currency)}</span>
                </div>
                <div className="record-row">
                  <span>
                    <strong>Net profit</strong>
                    <small>Gross profit minus expenses</small>
                  </span>
                  <span>{formatCurrency(netProfit, selectedWorkspace.currency)}</span>
                </div>
              </div>
            </section>

            <Card>
              <CardHeader>
                <Calculator aria-hidden="true" size={20} />
                <h2>ROI calculator</h2>
              </CardHeader>
              <CardContent>
                <div className="stack-form">
                  <label className="field-group">
                    Expected revenue
                    <Input min="0" onChange={(event) => setRoiRevenue(event.target.value)} step="0.01" type="number" value={roiRevenue} />
                  </label>
                  <label className="field-group">
                    Expected direct costs
                    <Input min="0" onChange={(event) => setRoiCosts(event.target.value)} step="0.01" type="number" value={roiCosts} />
                  </label>
                  <label className="field-group">
                    Expected monthly expenses
                    <Input min="0" onChange={(event) => setRoiExpenses(event.target.value)} step="0.01" type="number" value={roiExpenses} />
                  </label>
                  <div className="detail-panel">
                    <div>
                      <p className="eyebrow">ROI preview</p>
                      <h2>{roiPreview.toFixed(2)}%</h2>
                      <p className="lead">Based on the selected business capital amount.</p>
                    </div>
                    <dl>
                      <div>
                        <dt>Net profit</dt>
                        <dd>{formatCurrency(Number(roiRevenue) - Number(roiCosts) - Number(roiExpenses), selectedWorkspace.currency)}</dd>
                      </div>
                      <div>
                        <dt>Capital</dt>
                        <dd>{formatCurrency(selectedBusiness?.capital_amount ?? 0, selectedWorkspace.currency)}</dd>
                      </div>
                      <div>
                        <dt>Preview sale GP</dt>
                        <dd>{formatCurrency(previewGrossProfit, selectedWorkspace.currency)}</dd>
                      </div>
                      <div>
                        <dt>Preview margin</dt>
                        <dd>
                          {selectedProduct
                            ? `${calculateProfitMargin(selectedProduct.profit_per_unit, selectedProduct.selling_price).toFixed(2)}%`
                            : '0.00%'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  )
}
