import { useState, type FormEvent } from 'react'
import { Plus, Users } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, Input } from '../../../components/ui'
import { currencyOptions, workspaceTypeOptions } from '../../../constants/options'
import { canManageWorkspaceMembers } from '../../../lib/permissions'
import type { CurrencyCode, WorkspaceRole, WorkspaceType } from '../../../types/domain'
import { addWorkspaceMember, createWorkspace } from '../services/workspaceService'
import { useWorkspaceOutlet } from '../../../hooks/useWorkspaceOutlet'

const inviteRoleOptions: WorkspaceRole[] = ['admin', 'editor', 'viewer']

export function WorkspacesPage() {
  const {
    error,
    isLoading,
    loadWorkspaces,
    selectedWorkspace,
    selectWorkspace,
    workspaces,
  } = useWorkspaceOutlet()
  const [workspaceName, setWorkspaceName] = useState('')
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType>('personal')
  const [currency, setCurrency] = useState<CurrencyCode>('PHP')
  const [inviteUserId, setInviteUserId] = useState('')
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('viewer')
  const [formError, setFormError] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isInviting, setIsInviting] = useState(false)

  const selectedRole = selectedWorkspace?.membership?.role ?? null
  const canInvite = canManageWorkspaceMembers(selectedRole)

  const handleCreateWorkspace = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    setIsCreating(true)

    try {
      const workspace = await createWorkspace({
        currency,
        name: workspaceName,
        type: workspaceType,
      })
      setWorkspaceName('')
      await loadWorkspaces()
      selectWorkspace(workspace.id)
    } catch (createError) {
      setFormError(
        createError instanceof Error ? createError.message : 'Unable to create workspace.',
      )
    } finally {
      setIsCreating(false)
    }
  }

  const handleInviteMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedWorkspace) {
      return
    }

    setFormError('')
    setIsInviting(true)

    try {
      await addWorkspaceMember({
        role: inviteRole,
        userId: inviteUserId,
        workspaceId: selectedWorkspace.id,
      })
      setInviteUserId('')
    } catch (inviteError) {
      setFormError(
        inviteError instanceof Error ? inviteError.message : 'Unable to invite member.',
      )
    } finally {
      setIsInviting(false)
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Workspace foundation</p>
          <h1>Workspaces</h1>
          <p className="lead">
            Create isolated money spaces for personal, family, and business tracking.
          </p>
        </div>
      </header>

      {(error || formError) && <p className="form-error">{error || formError}</p>}

      <section className="content-grid">
        <Card>
          <CardHeader>
            <Plus aria-hidden="true" size={20} />
            <h2>Create workspace</h2>
          </CardHeader>
          <CardContent>
            <form className="stack-form" onSubmit={handleCreateWorkspace}>
              <label className="field-group">
                Name
                <Input
                  onChange={(event) => setWorkspaceName(event.target.value)}
                  placeholder="Personal Workspace"
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

              <Button disabled={isCreating} type="submit">
                <Plus aria-hidden="true" size={18} />
                {isCreating ? 'Creating...' : 'Create workspace'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Users aria-hidden="true" size={20} />
            <h2>Invite foundation</h2>
          </CardHeader>
          <CardContent>
            <form className="stack-form" onSubmit={handleInviteMember}>
              <label className="field-group">
                User ID
                <Input
                  disabled={!canInvite || !selectedWorkspace}
                  onChange={(event) => setInviteUserId(event.target.value)}
                  placeholder="Supabase user uuid"
                  required
                  value={inviteUserId}
                />
              </label>

              <label className="field-group">
                Role
                <select
                  className="field-input"
                  disabled={!canInvite || !selectedWorkspace}
                  onChange={(event) => setInviteRole(event.target.value as WorkspaceRole)}
                  value={inviteRole}
                >
                  {inviteRoleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>

              <Button disabled={!canInvite || isInviting || !selectedWorkspace} type="submit">
                <Users aria-hidden="true" size={18} />
                {isInviting ? 'Inviting...' : 'Add invited member'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="list-panel">
        <div className="section-heading">
          <h2>Your workspaces</h2>
          <span>{isLoading ? 'Loading' : `${workspaces.length} total`}</span>
        </div>

        {workspaces.length === 0 && !isLoading ? (
          <p className="empty-state">Create your first workspace to unlock accounts and categories.</p>
        ) : (
          <div className="record-list">
            {workspaces.map((workspace) => (
              <button
                className="record-row"
                key={workspace.id}
                onClick={() => selectWorkspace(workspace.id)}
                type="button"
              >
                <span>
                  <strong>{workspace.name}</strong>
                  <small>{workspace.type.replace('_', ' ')} / {workspace.currency}</small>
                </span>
                <span className="badge">{workspace.membership?.role ?? 'member'}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
