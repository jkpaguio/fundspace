import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import { PageHeader } from '../../../components/common/PageHeader'
import { Button, Card, CardContent, CardHeader, Input } from '../../../components/ui'
import {
  currencyOptions,
  workspaceTypeDescriptions,
  workspaceTypeOptions,
} from '../../../constants/options'
import { routes } from '../../../app/routes'
import type { CurrencyCode, WorkspaceType } from '../../../types/domain'
import { useWorkspaceOutlet } from '../../../hooks/useWorkspaceOutlet'
import { createWorkspace } from '../services/workspaceService'

export function CreateWorkspacePage() {
  const navigate = useNavigate()
  const { loadWorkspaces, selectWorkspace } = useWorkspaceOutlet()
  const [workspaceName, setWorkspaceName] = useState('')
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType>('personal')
  const [currency, setCurrency] = useState<CurrencyCode>('PHP')
  const [error, setError] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateWorkspace = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsCreating(true)

    try {
      const workspace = await createWorkspace({
        currency,
        name: workspaceName,
        type: workspaceType,
      })

      await loadWorkspaces()
      selectWorkspace(workspace.id)
      navigate(routes.workspace)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create space.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Create space"
        heading="Start a money space"
        lead="Create one focused area for personal money, family planning, business operations, or a side hustle."
      />

      {error && <p className="form-error">{error}</p>}

      <section className="content-grid content-grid-single">
        <Card>
          <CardHeader>
            <Plus aria-hidden="true" size={20} />
            <h2>Space details</h2>
          </CardHeader>
          <CardContent>
            <form className="stack-form" onSubmit={handleCreateWorkspace}>
              <label className="field-group">
                Name
                <Input
                  onChange={(event) => setWorkspaceName(event.target.value)}
                  placeholder="Personal space"
                  required
                  value={workspaceName}
                />
              </label>

              <label className="field-group">
                Type
                <select
                  className="field-input"
                  onChange={(event) => setWorkspaceType(event.target.value as WorkspaceType)}
                  value={workspaceType}
                >
                  {workspaceTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="field-helper">{workspaceTypeDescriptions[workspaceType]}</span>
              </label>

              <label className="field-group">
                Currency
                <select
                  className="field-input"
                  onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
                  value={currency}
                >
                  {currencyOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <div className="inline-actions">
                <Button disabled={isCreating} type="submit">
                  <Plus aria-hidden="true" size={18} />
                  {isCreating ? 'Creating...' : 'Create space'}
                </Button>
                <Button onClick={() => navigate(routes.workspace)} type="button" variant="secondary">
                  <ArrowLeft aria-hidden="true" size={18} />
                  Back to spaces
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
