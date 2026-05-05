import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BriefcaseBusiness, CheckCircle2, Plus, Settings2 } from 'lucide-react'
import { EmptyState } from '../../../components/common/EmptyState'
import { PageHeader } from '../../../components/common/PageHeader'
import { Button, Input } from '../../../components/ui'
import { workspaceTypeDescriptions } from '../../../constants/options'
import { routes } from '../../../app/routes'
import { useAuthSession } from '../../../hooks/useAuthSession'
import { useWorkspaceOutlet } from '../../../hooks/useWorkspaceOutlet'
import { canManageWorkspaceMembers } from '../../../lib/permissions'
import { acceptWorkspaceInvite } from '../services/workspaceService'

export function WorkspacesPage() {
  const navigate = useNavigate()
  const { session } = useAuthSession()
  const {
    error,
    isLoading,
    loadWorkspaces,
    selectedWorkspace,
    selectWorkspace,
    workspaces,
  } = useWorkspaceOutlet()
  const [searchTerm, setSearchTerm] = useState('')
  const [formError, setFormError] = useState('')
  const [pendingWorkspaceId, setPendingWorkspaceId] = useState('')
  const currentUserId = session?.user.id ?? ''

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const filteredWorkspaces = useMemo(
    () =>
      workspaces.filter((workspace) => {
        if (normalizedSearch.length === 0) {
          return true
        }

        return (
          workspace.name.toLowerCase().includes(normalizedSearch)
          || workspace.currency.toLowerCase().includes(normalizedSearch)
          || workspace.type.replaceAll('_', ' ').toLowerCase().includes(normalizedSearch)
        )
      }),
    [normalizedSearch, workspaces],
  )

  const ownedWorkspaces = useMemo(
    () => filteredWorkspaces.filter((workspace) => workspace.owner_id === currentUserId),
    [currentUserId, filteredWorkspaces],
  )
  const sharedWorkspaces = useMemo(
    () => filteredWorkspaces.filter((workspace) => workspace.owner_id !== currentUserId),
    [currentUserId, filteredWorkspaces],
  )

  const handleSelectWorkspace = (workspaceId: string) => {
    selectWorkspace(workspaceId)
    navigate(routes.dashboard)
  }

  const handleOpenWorkspaceSettings = (workspaceId: string) => {
    selectWorkspace(workspaceId)
    navigate(routes.workspaceSettings)
  }

  const handleAcceptInvite = async (workspaceId: string) => {
    setFormError('')
    setPendingWorkspaceId(workspaceId)

    try {
      await acceptWorkspaceInvite(workspaceId)
      await loadWorkspaces()
      selectWorkspace(workspaceId)
      navigate(routes.dashboard)
    } catch (acceptError) {
      setFormError(
        acceptError instanceof Error ? acceptError.message : 'Unable to accept invite.',
      )
    } finally {
      setPendingWorkspaceId('')
    }
  }

  const hasNoSpaces = !isLoading && workspaces.length === 0

  return (
    <div className="page-stack workspace-page">
      <PageHeader
        eyebrow="Select space"
        heading="Choose a space to enter"
        lead="Pick the money space you want to open, then continue into the right money area."
      />

      {(error || formError) && <p className="form-error">{error || formError}</p>}

      {hasNoSpaces ? (
        <EmptyState
          action={
            <Button asChild>
              <Link to={routes.createWorkspace}>Create your first space</Link>
            </Button>
          }
          description="Spaces keep personal, family, business, and side-hustle money separate. Start with one simple space, then add more later."
          title="No space yet"
        />
      ) : (
        <>
          <section className="section-surface section-surface-muted workspace-picker-toolbar">
            <div className="workspace-picker-toolbar-main">
              <Button asChild>
                <Link to={routes.createWorkspace}>
                  <Plus aria-hidden="true" size={18} />
                  Create space
                </Link>
              </Button>

              <div className="workspace-picker-meta">
                <span className="badge">{workspaces.length} spaces</span>
                <span className="badge">
                  {ownedWorkspaces.length} owned / {sharedWorkspaces.length} shared
                </span>
                {selectedWorkspace && (
                  <span className="badge">
                    <CheckCircle2 aria-hidden="true" size={14} />
                    Active: {selectedWorkspace.name}
                  </span>
                )}
              </div>
            </div>

            <div className="workspace-picker-secondary">
              {selectedWorkspace && (
                <Button asChild variant="secondary">
                  <Link to={routes.workspaceSettings}>
                    <BriefcaseBusiness aria-hidden="true" size={18} />
                    Manage active space
                  </Link>
                </Button>
              )}
              <Button asChild variant="secondary">
                <Link to={routes.settings}>
                  <Settings2 aria-hidden="true" size={18} />
                  Profile and settings
                </Link>
              </Button>
            </div>
          </section>

          <section className="section-surface workspace-search-panel">
            <div className="section-heading section-heading-stack">
              <div>
                <h2>Find a space</h2>
                <p className="section-description">
                  Choose first. Deeper member and identity changes stay inside Space settings.
                </p>
              </div>
              <span>{filteredWorkspaces.length} matches</span>
            </div>

            <Input
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name, type, or currency"
              value={searchTerm}
            />
          </section>

          <section className="workspace-grid workspace-grid-wide">
            <section className="list-panel">
              <div className="section-heading">
                <h2>Owned by you</h2>
                <span>{ownedWorkspaces.length} spaces</span>
              </div>

              {ownedWorkspaces.length === 0 ? (
                <EmptyState
                  description={
                    normalizedSearch
                      ? 'Try a different search to bring your own spaces back into view.'
                      : 'Create your first personal, family, business, or side-hustle space here.'
                  }
                  title={normalizedSearch ? 'No owned spaces match' : 'You have not created a space yet'}
                />
              ) : (
                <div className="record-list">
                  {ownedWorkspaces.map((workspace) => {
                    const isSelected = selectedWorkspace?.id === workspace.id

                    return (
                      <div
                        className={`record-row workspace-select-row ${isSelected ? 'workspace-card-selected' : ''}`}
                        key={workspace.id}
                      >
                        <div className="workspace-select-info">
                          <strong>{workspace.name}</strong>
                          <small>{workspaceTypeDescriptions[workspace.type]} / {workspace.currency}</small>
                          <div className="workspace-select-badges">
                            <span className="badge">owner</span>
                            {isSelected && (
                              <span className="badge">
                                <CheckCircle2 aria-hidden="true" size={14} />
                                Active now
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="workspace-select-action-row">
                          <Button
                            onClick={() => handleOpenWorkspaceSettings(workspace.id)}
                            type="button"
                            variant="secondary"
                          >
                            <Settings2 aria-hidden="true" size={16} />
                            Settings
                          </Button>
                          <Button onClick={() => handleSelectWorkspace(workspace.id)} type="button">
                            {isSelected ? 'Continue' : 'Select'}
                            <ArrowRight aria-hidden="true" size={16} />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            <section className="list-panel">
              <div className="section-heading">
                <h2>Shared with you</h2>
                <span>{sharedWorkspaces.length} spaces</span>
              </div>

              {sharedWorkspaces.length === 0 ? (
                <EmptyState
                  description={
                    normalizedSearch
                      ? 'Try a different search to look for shared spaces again.'
                      : 'Accepted invites will show up here so you can jump into spaces shared by family, teammates, or clients.'
                  }
                  title={normalizedSearch ? 'No shared spaces match' : 'No shared spaces yet'}
                />
              ) : (
                <div className="record-list">
                  {sharedWorkspaces.map((workspace) => {
                    const isSelected = selectedWorkspace?.id === workspace.id
                    const membershipStatus = workspace.membership?.status ?? 'active'
                    const membershipRole = workspace.membership?.role ?? null
                    const isInvited = membershipStatus === 'invited'
                    const isPending = pendingWorkspaceId === workspace.id
                    const canManageThisSpace = canManageWorkspaceMembers(membershipRole)

                    return (
                      <div
                        className={`record-row workspace-select-row ${isSelected ? 'workspace-card-selected' : ''}`}
                        key={workspace.id}
                      >
                        <div className="workspace-select-info">
                          <strong>{workspace.name}</strong>
                          <small>{workspaceTypeDescriptions[workspace.type]} / {workspace.currency}</small>
                          <div className="workspace-select-badges">
                            <span className="badge">{membershipRole ?? 'member'}</span>
                            <span className="badge">{membershipStatus}</span>
                            {isSelected && (
                              <span className="badge">
                                <CheckCircle2 aria-hidden="true" size={14} />
                                Active now
                              </span>
                            )}
                          </div>
                        </div>
                        <div
                          className={`workspace-select-action-row ${
                            isInvited || !canManageThisSpace ? 'workspace-select-action-row-single' : ''
                          }`}
                        >
                          {isInvited ? (
                            <Button
                              disabled={isPending}
                              onClick={() => void handleAcceptInvite(workspace.id)}
                              type="button"
                            >
                              {isPending ? 'Accepting...' : 'Accept and open'}
                            </Button>
                          ) : (
                            <>
                              {canManageThisSpace && (
                                <Button
                                  onClick={() => handleOpenWorkspaceSettings(workspace.id)}
                                  type="button"
                                  variant="secondary"
                                >
                                  <Settings2 aria-hidden="true" size={16} />
                                  Settings
                                </Button>
                              )}
                              <Button onClick={() => handleSelectWorkspace(workspace.id)} type="button">
                                {isSelected ? 'Continue' : 'Select'}
                                <ArrowRight aria-hidden="true" size={16} />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </section>
        </>
      )}
    </div>
  )
}
