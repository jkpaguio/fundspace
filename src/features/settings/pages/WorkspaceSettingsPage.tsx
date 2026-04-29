import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Save, Settings2, Users } from 'lucide-react'
import { PageHeader } from '../../../components/common/PageHeader'
import { Button, Card, CardContent, CardHeader, Input } from '../../../components/ui'
import { currencyOptions, workspaceTypeOptions } from '../../../constants/options'
import { useWorkspaceOutlet } from '../../../hooks/useWorkspaceOutlet'
import { canManageWorkspaceMembers } from '../../../lib/permissions'
import type { CurrencyCode, WorkspaceRole, WorkspaceType } from '../../../types/domain'
import {
  addWorkspaceMember,
  listWorkspaceMembers,
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
  updateWorkspaceSettings,
} from '../../workspaces/services/workspaceService'

const inviteRoleOptions: WorkspaceRole[] = ['admin', 'editor', 'viewer']

export function WorkspaceSettingsPage() {
  const { loadWorkspaces, selectedWorkspace } = useWorkspaceOutlet()
  const [workspaceName, setWorkspaceName] = useState('')
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType>('personal')
  const [workspaceCurrency, setWorkspaceCurrency] = useState<CurrencyCode>('PHP')
  const [members, setMembers] = useState<Array<{
    id: string
    role: WorkspaceRole
    status: string
    user_id: string
  }>>([])
  const [inviteUserId, setInviteUserId] = useState('')
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('viewer')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const [isUpdatingMemberId, setIsUpdatingMemberId] = useState('')
  const [isRemovingMemberId, setIsRemovingMemberId] = useState('')

  const selectedRole = selectedWorkspace?.membership?.role ?? null
  const canManageMembers = canManageWorkspaceMembers(selectedRole)

  const loadMembers = useCallback(async () => {
    if (!selectedWorkspace) {
      setMembers([])
      return
    }

    setIsLoadingMembers(true)
    setError('')

    try {
      setMembers(await listWorkspaceMembers(selectedWorkspace.id))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load space members.')
    } finally {
      setIsLoadingMembers(false)
    }
  }, [selectedWorkspace])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (selectedWorkspace) {
        setWorkspaceName(selectedWorkspace.name)
        setWorkspaceType(selectedWorkspace.type)
        setWorkspaceCurrency(selectedWorkspace.currency)
      }

      void loadMembers()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadMembers, selectedWorkspace])

  const handleSaveWorkspace = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedWorkspace) {
      return
    }

    setIsSavingWorkspace(true)
    setError('')
    setMessage('')

    try {
      await updateWorkspaceSettings({
        currency: workspaceCurrency,
        name: workspaceName,
        type: workspaceType,
        workspaceId: selectedWorkspace.id,
      })
      await loadWorkspaces()
      setMessage('Space settings updated.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save space settings.')
    } finally {
      setIsSavingWorkspace(false)
    }
  }

  const handleInviteMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedWorkspace) {
      return
    }

    setIsInviting(true)
    setError('')
    setMessage('')

    try {
      await addWorkspaceMember({
        role: inviteRole,
        userId: inviteUserId,
        workspaceId: selectedWorkspace.id,
      })
      setInviteUserId('')
      await loadMembers()
      setMessage('Space invite added.')
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : 'Unable to invite member.')
    } finally {
      setIsInviting(false)
    }
  }

  const handleUpdateMemberRole = async (
    membershipId: string,
    role: Exclude<WorkspaceRole, 'owner'>,
  ) => {
    setIsUpdatingMemberId(membershipId)
    setError('')
    setMessage('')

    try {
      await updateWorkspaceMemberRole({ membershipId, role })
      await loadMembers()
      setMessage('Member role updated.')
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update member role.')
    } finally {
      setIsUpdatingMemberId('')
    }
  }

  const handleRemoveMember = async (membershipId: string) => {
    setIsRemovingMemberId(membershipId)
    setError('')
    setMessage('')

    try {
      await removeWorkspaceMember(membershipId)
      await loadMembers()
      setMessage('Member removed from space.')
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Unable to remove member.')
    } finally {
      setIsRemovingMemberId('')
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Space settings"
        heading="Manage active space"
        lead="Update the active space identity, currency, and member access from one focused settings screen."
      />

      {error && <p className="form-error">{error}</p>}
      {message && <p className="form-success">{message}</p>}

      {!selectedWorkspace ? (
        <p className="empty-state">Select a space before opening space settings.</p>
      ) : (
        <>
          <section className="content-grid">
            <Card>
              <CardHeader>
                <Settings2 aria-hidden="true" size={20} />
                <h2>Space identity</h2>
              </CardHeader>
              <CardContent>
                <form className="stack-form" onSubmit={handleSaveWorkspace}>
                  <label className="field-group">
                    Space name
                    <Input
                      onChange={(event) => setWorkspaceName(event.target.value)}
                      required
                      value={workspaceName}
                    />
                  </label>

                  <label className="field-group">
                    Space type
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
                      onChange={(event) => setWorkspaceCurrency(event.target.value as CurrencyCode)}
                      value={workspaceCurrency}
                    >
                      {currencyOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <Button disabled={isSavingWorkspace} type="submit">
                    <Save aria-hidden="true" size={18} />
                    {isSavingWorkspace ? 'Saving...' : 'Save space'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users aria-hidden="true" size={20} />
                <h2>Invite member</h2>
              </CardHeader>
              <CardContent>
                <form className="stack-form" onSubmit={handleInviteMember}>
                  <label className="field-group">
                    User ID
                    <Input
                      disabled={!canManageMembers}
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
                      disabled={!canManageMembers}
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

                  <Button disabled={!canManageMembers || isInviting} type="submit">
                    <Users aria-hidden="true" size={18} />
                    {isInviting ? 'Inviting...' : 'Add invited member'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </section>

          <section className="list-panel">
            <div className="section-heading">
              <h2>Space members</h2>
              <span>{isLoadingMembers ? 'Loading' : `${members.length} members`}</span>
            </div>

            {members.length === 0 && !isLoadingMembers ? (
              <p className="empty-state">No members loaded for this space yet.</p>
            ) : (
              <div className="record-list">
                {members.map((member) => (
                  <div className="record-row record-row-stack" key={member.id}>
                    <span>
                      <strong>{member.user_id}</strong>
                      <small>{member.status}</small>
                    </span>
                    <span className="inline-actions">
                      {canManageMembers && member.role !== 'owner' ? (
                        <>
                          <select
                            className="field-input"
                            disabled={isUpdatingMemberId === member.id || member.status === 'removed'}
                            onChange={(event) =>
                              void handleUpdateMemberRole(
                                member.id,
                                event.target.value as Exclude<WorkspaceRole, 'owner'>,
                              )
                            }
                            value={member.role}
                          >
                            <option value="admin">admin</option>
                            <option value="editor">editor</option>
                            <option value="viewer">viewer</option>
                          </select>
                          <Button
                            disabled={isRemovingMemberId === member.id || member.status === 'removed'}
                            onClick={() => void handleRemoveMember(member.id)}
                            type="button"
                            variant="ghost"
                          >
                            {isRemovingMemberId === member.id ? 'Removing...' : 'Remove'}
                          </Button>
                        </>
                      ) : (
                        <span className="badge">{member.role}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
