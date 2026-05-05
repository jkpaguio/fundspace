import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Archive, Pencil, Plus, Save, X } from 'lucide-react'
import { SyncBadge } from '../../../components/common/SyncBadge'
import { Button, Input, Modal } from '../../../components/ui'
import { categoryTypeOptions } from '../../../constants/options'
import type { Category, CategoryType } from '../../../types/domain'
import { useWorkspaceOutlet } from '../../../hooks/useWorkspaceOutlet'
import { archiveCategory, createCategory, listCategories, updateCategory } from '../services/categoryService'

type CategoryEditDraft = {
  categoryId: string
  color: string
  name: string
  type: CategoryType
}

export function CategoriesPage() {
  const { selectedWorkspace } = useWorkspaceOutlet()
  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [type, setType] = useState<CategoryType>('expense')
  const [color, setColor] = useState('#1d7a5d')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [archivingCategoryId, setArchivingCategoryId] = useState('')
  const [editingCategory, setEditingCategory] = useState<CategoryEditDraft | null>(null)
  const [savingCategoryId, setSavingCategoryId] = useState('')

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
      setIsCreateModalOpen(false)
      await loadCategories()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create category.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleArchiveCategory = async (categoryId: string) => {
    setArchivingCategoryId(categoryId)
    setError('')

    try {
      await archiveCategory(categoryId)
      await loadCategories()
    } catch (archiveError) {
      setError(
        archiveError instanceof Error ? archiveError.message : 'Unable to archive category.',
      )
    } finally {
      setArchivingCategoryId('')
    }
  }

  const handleSaveCategory = async () => {
    if (!editingCategory) {
      return
    }

    setSavingCategoryId(editingCategory.categoryId)
    setError('')

    try {
      await updateCategory(editingCategory)
      setEditingCategory(null)
      await loadCategories()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update category.')
    } finally {
      setSavingCategoryId('')
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
        <p className="empty-state">Create a space before adding categories.</p>
      ) : (
        <>
          <section className="list-panel">
            <div className="section-heading">
              <h2>Category settings</h2>
              <span className="inline-actions">
                <span>{isLoading ? 'Loading' : `${categories.length} visible`}</span>
                <Button onClick={() => setIsCreateModalOpen(true)} type="button">
                  <Plus aria-hidden="true" size={18} />
                  Add category
                </Button>
              </span>
            </div>

            {categories.length === 0 && !isLoading ? (
              <p className="empty-state">No categories found for this workspace.</p>
            ) : (
              <div className="record-list">
                {categories.map((category) => (
                  <div className="record-row" key={category.id}>
                    {editingCategory?.categoryId === category.id ? (
                      <span className="inline-edit-fields">
                        <Input
                          onChange={(event) =>
                            setEditingCategory({ ...editingCategory, name: event.target.value })
                          }
                          required
                          value={editingCategory.name}
                        />
                        <select
                          className="field-input"
                          onChange={(event) =>
                            setEditingCategory({
                              ...editingCategory,
                              type: event.target.value as CategoryType,
                            })
                          }
                          value={editingCategory.type}
                        >
                          {categoryTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <Input
                          onChange={(event) =>
                            setEditingCategory({ ...editingCategory, color: event.target.value })
                          }
                          type="color"
                          value={editingCategory.color}
                        />
                      </span>
                    ) : (
                      <span>
                        <strong>{category.name}</strong>
                        <small>{category.type.replace('_', ' ')}</small>
                        <SyncBadge status={(category as { sync_status?: string }).sync_status} />
                      </span>
                    )}
                    <span className="category-meta">
                      <span
                        aria-hidden="true"
                        className="color-dot"
                        style={{ background: category.color ?? '#94a3b8' }}
                      />
                      {category.is_default ? (
                        'Default'
                      ) : editingCategory?.categoryId === category.id ? (
                        <>
                          <Button
                            disabled={savingCategoryId === category.id}
                            onClick={() => void handleSaveCategory()}
                            type="button"
                            variant="ghost"
                          >
                            <Save aria-hidden="true" size={16} />
                            {savingCategoryId === category.id ? 'Saving...' : 'Save'}
                          </Button>
                          <Button onClick={() => setEditingCategory(null)} type="button" variant="ghost">
                            <X aria-hidden="true" size={16} />
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            onClick={() =>
                              setEditingCategory({
                                categoryId: category.id,
                                color: category.color ?? '#1d7a5d',
                                name: category.name,
                                type: category.type,
                              })
                            }
                            type="button"
                            variant="ghost"
                          >
                            <Pencil aria-hidden="true" size={16} />
                            Edit
                          </Button>
                          <Button
                            disabled={archivingCategoryId === category.id}
                            onClick={() => handleArchiveCategory(category.id)}
                            type="button"
                            variant="ghost"
                          >
                            <Archive aria-hidden="true" size={16} />
                            {archivingCategoryId === category.id ? 'Archiving...' : 'Archive'}
                          </Button>
                        </>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Modal
            description="Create a custom category for the active workspace."
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            title="Add category"
          >
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
          </Modal>
        </>
      )}
    </div>
  )
}
