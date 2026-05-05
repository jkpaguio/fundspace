import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Save, Search, Settings2 } from 'lucide-react'
import { PageHeader } from '../../../components/common/PageHeader'
import { Button, Card, CardContent, CardHeader, Input } from '../../../components/ui'
import { routes } from '../../../app/routes'
import { currencyOptions, workspaceTypeOptions } from '../../../constants/options'
import { useWorkspaceOutlet } from '../../../hooks/useWorkspaceOutlet'
import { canManageWorkspaceMembers } from '../../../lib/permissions'
import type { CurrencyCode, MemberSearchResult, WorkspaceRole, WorkspaceType } from '../../../types/domain'
import {
  addWorkspaceMember,
  deleteWorkspace,
  listWorkspaceMembers,
  removeWorkspaceMember,
  searchWorkspaceInvitableProfiles,
  updateWorkspaceMemberRole,
  updateWorkspaceSettings,
  type WorkspaceMemberWithProfile,
} from '../../workspaces/services/workspaceService'

const inviteRoleOptions: WorkspaceRole[] = ['admin', 'editor', 'viewer']
const roleDescriptions: Record<WorkspaceRole, string> = {
  admin: 'Can manage members and most space settings.',
  editor: 'Can record and update day-to-day financial data.',
  owner: 'Has full control of the space.',
  viewer: 'Can look around without changing records.',
}

export function WorkspaceSettingsPage() {
  const navigate = useNavigate()
  const { loadWorkspaces, selectedWorkspace } = useWorkspaceOutlet()
  const [workspaceName, setWorkspaceName] = useState('')
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType>('personal')
  const [workspaceCurrency, setWorkspaceCurrency] = useState<CurrencyCode>('PHP')
  const [members, setMembers] = useState<WorkspaceMemberWithProfile[]>([])
  const [memberSearchQuery, setMemberSearchQuery] = useState('')
  const [memberSearchResults, setMemberSearchResults] = useState<MemberSearchResult[]>([])
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('viewer')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false)
  const [isUpdatingMemberId, setIsUpdatingMemberId] = useState('')
  const [isRemovingMemberId, setIsRemovingMemberId] = useState('')
  const [deleteConfirmationName, setDeleteConfirmationName] = useState('')
  const [isDeletingWorkspace, setIsDeletingWorkspace] = useState(false)
  const [isSearchingMembers, setIsSearchingMembers] = useState(false)
  const [isInvitingUserId, setIsInvitingUserId] = useState('')

  const selectedRole = selectedWorkspace?.membership?.role ?? null
  const canManageMembers = canManageWorkspaceMembers(selectedRole)
  const isOwner = selectedRole === 'owner'
  const canEditSpaceIdentity = canManageMembers

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

  const handleSearchMembers = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedWorkspace || !canManageMembers) {
      return
    }

    const normalizedQuery = memberSearchQuery.trim()
    setIsSearchingMembers(true)
    setError('')
    setMessage('')

    try {
      setMemberSearchResults(
        normalizedQuery.length < 2
          ? []
          : await searchWorkspaceInvitableProfiles({
              query: normalizedQuery,
              workspaceId: selectedWorkspace.id,
            }),
      )
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Unable to search members.')
    } finally {
      setIsSearchingMembers(false)
    }
  }

  const handleInviteMember = async (userId: string) => {
    if (!selectedWorkspace) {
      return
    }

    setIsInvitingUserId(userId)
    setError('')
    setMessage('')

    try {
      await addWorkspaceMember({
        role: inviteRole,
        userId,
        workspaceId: selectedWorkspace.id,
      })
      setMemberSearchResults((current) => current.filter((result) => result.id !== userId))
      await loadMembers()
      setMessage('Space invite added.')
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : 'Unable to invite member.')
    } finally {
      setIsInvitingUserId('')
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

  const handleDeleteWorkspace = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedWorkspace || !isOwner) {
      return
    }

    if (deleteConfirmationName.trim() !== selectedWorkspace.name) {
      setError('Type the exact space name before deleting it.')
      setMessage('')
      return
    }

    setIsDeletingWorkspace(true)
    setError('')
    setMessage('')

    try {
      await deleteWorkspace(selectedWorkspace.id)
      await loadWorkspaces()
      navigate(routes.workspace)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete space.')
    } finally {
      setIsDeletingWorkspace(false)
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Space settings"
        heading="Manage active space"
        lead="Update the active space identity here, then manage member access in a separate secondary area when your role allows it."
      />

      {error && <p className="form-error">{error}</p>}
      {message && <p className="form-success">{message}</p>}

      {!selectedWorkspace ? (
        <p className="empty-state">Select a space before opening space settings.</p>
      ) : (
        <>
          <section className="budget-warning">
            <Settings2 aria-hidden="true" size={20} />
            <div>
              <h2>Administrative tools live here</h2>
              <p>
                Space switching stays on the Spaces screen. This area is for owners and admins who
                need to update identity, member access, and deeper space controls.
              </p>
            </div>
          </section>

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
                      disabled={!canEditSpaceIdentity}
                      onChange={(event) => setWorkspaceName(event.target.value)}
                      required
                      value={workspaceName}
                    />
                  </label>

                  <label className="field-group">
                    Space type
                    <select
                      className="field-input"
                      disabled={!canEditSpaceIdentity}
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
                      disabled={!canEditSpaceIdentity}
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

                  <Button disabled={!canEditSpaceIdentity || isSavingWorkspace} type="submit">
                    <Save aria-hidden="true" size={18} />
                    {isSavingWorkspace ? 'Saving...' : 'Save space'}
                  </Button>

                  {!canEditSpaceIdentity && (
                    <p className="muted-note">
                      Only owners and admins can update the name, type, or currency for this space.
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Search aria-hidden="true" size={20} />
                <h2>Find and invite member</h2>
              </CardHeader>
              <CardContent>
                <p className="section-description">
                  Search by name or email, then invite the right person into this space without
                  exposing raw account IDs.
                </p>
                <form className="stack-form" onSubmit={handleSearchMembers}>
                  <label className="field-group">
                    Find by name or email
                    <Input
                      disabled={!canManageMembers}
                      onChange={(event) => setMemberSearchQuery(event.target.value)}
                      placeholder="Search for a member"
                      required
                      value={memberSearchQuery}
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

                  <Button disabled={!canManageMembers || isSearchingMembers} type="submit">
                    <Search aria-hidden="true" size={18} />
                    {isSearchingMembers ? 'Searching...' : 'Search members'}
                  </Button>

                  {!canManageMembers && (
                    <p className="muted-note">
                      Only owners and admins can invite members or change member roles.
                    </p>
                  )}
                </form>

                {canManageMembers && memberSearchQuery.trim().length > 0 && memberSearchQuery.trim().length < 2 && (
                  <p className="muted-note">Type at least 2 characters to search safely.</p>
                )}

                {canManageMembers && memberSearchQuery.trim().length >= 2 && !isSearchingMembers && memberSearchResults.length === 0 && !error && (
                  <p className="empty-state">No matching people are available to invite right now.</p>
                )}

                {memberSearchResults.length > 0 && (
                  <div className="record-list workspace-search-results">
                    {memberSearchResults.map((result) => (
                      <div className="record-row" key={result.id}>
                        <span>
                          <strong>{result.full_name || 'Unnamed member'}</strong>
                          <small>{result.email || 'No email available'}</small>
                        </span>
                        <Button
                          disabled={isInvitingUserId === result.id}
                          onClick={() => void handleInviteMember(result.id)}
                          type="button"
                        >
                          {isInvitingUserId === result.id ? 'Inviting...' : `Invite as ${inviteRole}`}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="list-panel">
            <div className="section-heading">
              <h2>Member access</h2>
              <span>{isLoadingMembers ? 'Loading' : `${members.length} members`}</span>
            </div>

            {members.length === 0 && !isLoadingMembers ? (
              <p className="empty-state">No members loaded for this space yet.</p>
            ) : (
              <div className="record-list">
                {members.map((member) => (
                  <div className="record-row record-row-stack" key={member.id}>
                    <span>
                      <strong>{member.full_name || member.email || 'Unnamed member'}</strong>
                      <small>{member.email || 'No email available'}</small>
                      <small>{member.status} / {roleDescriptions[member.role]}</small>
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

          <Card>
            <CardHeader>
              <Settings2 aria-hidden="true" size={20} />
              <h2>Danger zone</h2>
            </CardHeader>
            <CardContent>
              {!isOwner ? (
                <p className="muted-note">
                  Only the space owner can permanently delete this space.
                </p>
              ) : (
                <form className="stack-form" onSubmit={handleDeleteWorkspace}>
                  <p className="section-description">
                    Deleting a space is permanent. Type the exact space name to confirm before the
                    delete button becomes meaningful.
                  </p>

                  <label className="field-group">
                    Type space name to confirm
                    <Input
                      onChange={(event) => setDeleteConfirmationName(event.target.value)}
                      placeholder={selectedWorkspace.name}
                      value={deleteConfirmationName}
                    />
                  </label>

                  <Button
                    disabled={isDeletingWorkspace || deleteConfirmationName.trim() !== selectedWorkspace.name}
                    type="submit"
                    variant="ghost"
                  >
                    {isDeletingWorkspace ? 'Deleting...' : 'Delete this space'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
