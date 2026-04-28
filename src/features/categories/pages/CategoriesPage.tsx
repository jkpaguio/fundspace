import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, Input } from '../../../components/ui'
import { categoryTypeOptions } from '../../../constants/options'
import type { Category, CategoryType } from '../../../types/domain'
import { useWorkspaceOutlet } from '../../../hooks/useWorkspaceOutlet'
import { createCategory, listCategories } from '../services/categoryService'

export function CategoriesPage() {
  const { selectedWorkspace } = useWorkspaceOutlet()
  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [type, setType] = useState<CategoryType>('expense')
  const [color, setColor] = useState('#1d7a5d')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const loadCategories = useCallback(async () => {
    if (!selectedWorkspace) {
      return
    }

    setIsLoading(true)
    setError('')

    try {
      setCategories(await listCategories(selectedWorkspace.id))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load categories.')
    } finally {
      setIsLoading(false)
    }
  }, [selectedWorkspace])

  const handleCreateCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedWorkspace) {
      return
    }

    setIsCreating(true)
    setError('')

    try {
      await createCategory({
        color,
        name,
        type,
        workspaceId: selectedWorkspace.id,
      })
      setName('')
      await loadCategories()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create category.')
    } finally {
      setIsCreating(false)
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCategories()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadCategories])

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Categories</p>
          <h1>Classify money movement</h1>
          <p className="lead">Default categories are available everywhere. Custom categories stay inside the selected workspace.</p>
        </div>
      </header>

      {error && <p className="form-error">{error}</p>}

      {!selectedWorkspace ? (
        <p className="empty-state">Create a workspace before adding categories.</p>
      ) : (
        <section className="content-grid">
          <Card>
            <CardHeader>
              <Plus aria-hidden="true" size={20} />
              <h2>Add category</h2>
            </CardHeader>
            <CardContent>
              <form className="stack-form" onSubmit={handleCreateCategory}>
                <label className="field-group">
                  Name
                  <Input
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Groceries"
                    required
                    value={name}
                  />
                </label>

                <label className="field-group">
                  Type
                  <select
                    className="field-input"
                    onChange={(event) => setType(event.target.value as CategoryType)}
                    value={type}
                  >
                    {categoryTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field-group">
                  Color
                  <Input
                    onChange={(event) => setColor(event.target.value)}
                    type="color"
                    value={color}
                  />
                </label>

                <Button disabled={isCreating} type="submit">
                  <Plus aria-hidden="true" size={18} />
                  {isCreating ? 'Adding...' : 'Add category'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <section className="list-panel">
            <div className="section-heading">
              <h2>Category settings</h2>
              <span>{isLoading ? 'Loading' : `${categories.length} visible`}</span>
            </div>

            {categories.length === 0 && !isLoading ? (
              <p className="empty-state">No categories found for this workspace.</p>
            ) : (
              <div className="record-list">
                {categories.map((category) => (
                  <div className="record-row" key={category.id}>
                    <span>
                      <strong>{category.name}</strong>
                      <small>{category.type.replace('_', ' ')}</small>
                    </span>
                    <span className="category-meta">
                      <span
                        aria-hidden="true"
                        className="color-dot"
                        style={{ background: category.color ?? '#94a3b8' }}
                      />
                      {category.is_default ? 'Default' : 'Custom'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </section>
      )}
    </div>
  )
}
