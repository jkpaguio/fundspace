import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Archive, ArrowRightLeft, Pencil, PiggyBank, Plus, Save, X } from 'lucide-react'
import { SyncBadge } from '../../../components/common/SyncBadge'
import { Button, Card, CardContent, CardHeader, Input, Modal } from '../../../components/ui'
import { calculateGoalProgress } from '../../../lib/calculations'
import { formatCurrency } from '../../../lib/formatCurrency'
import { useWorkspaceOutlet } from '../../../hooks/useWorkspaceOutlet'
import type { Account, SavingsBucket } from '../../../types/domain'
import { listAccounts } from '../../accounts/services/accountService'
import {
  archiveSavingsBucket,
  createSavingsAllocation,
  createSavingsBucket,
  listSavingsBuckets,
  updateSavingsBucket,
} from '../services/savingsService'

type SavingsBucketEditDraft = {
  allocationPercentage: string
  bucketId: string
  linkedAccountId: string
  name: string
  targetAmount: string
  targetDate: string
}

const today = new Date().toISOString().slice(0, 10)

export function SavingsPage() {
  const { selectedWorkspace } = useWorkspaceOutlet()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [buckets, setBuckets] = useState<SavingsBucket[]>([])
  const [bucketName, setBucketName] = useState('')
  const [linkedAccountId, setLinkedAccountId] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [allocationPercentage, setAllocationPercentage] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [sourceAccountId, setSourceAccountId] = useState('')
  const [bucketId, setBucketId] = useState('')
  const [allocationAmount, setAllocationAmount] = useState('')
  const [allocationDate, setAllocationDate] = useState(today)
  const [allocationNotes, setAllocationNotes] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmittingBucket, setIsSubmittingBucket] = useState(false)
  const [isSubmittingAllocation, setIsSubmittingAllocation] = useState(false)
  const [activeModal, setActiveModal] = useState<'bucket' | 'allocation' | null>(null)
  const [archivingBucketId, setArchivingBucketId] = useState('')
  const [editingBucket, setEditingBucket] = useState<SavingsBucketEditDraft | null>(null)
  const [savingBucketId, setSavingBucketId] = useState('')

  const loadPageData = useCallback(async () => {
    if (!selectedWorkspace) {
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const [nextAccounts, nextBuckets] = await Promise.all([
        listAccounts(selectedWorkspace.id),
        listSavingsBuckets(selectedWorkspace.id),
      ])

      setAccounts(nextAccounts)
      setBuckets(nextBuckets)

      const nextSourceAccountId =
        nextAccounts.find((account) => account.id === sourceAccountId)?.id ?? nextAccounts[0]?.id ?? ''
      const nextLinkedAccountId =
        nextAccounts.find((account) => account.id === linkedAccountId)?.id ?? nextAccounts[0]?.id ?? ''
      const nextBucketId =
        nextBuckets.find((bucket) => bucket.id === bucketId)?.id ?? nextBuckets[0]?.id ?? ''

      setSourceAccountId(nextSourceAccountId)
      setLinkedAccountId(nextLinkedAccountId)
      setBucketId(nextBucketId)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load savings buckets.')
    } finally {
      setIsLoading(false)
    }
  }, [bucketId, linkedAccountId, selectedWorkspace, sourceAccountId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPageData()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadPageData])

  const totalAllocated = useMemo(
    () => buckets.reduce((total, bucket) => total + bucket.current_amount, 0),
    [buckets],
  )

  const handleCreateBucket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedWorkspace) {
      return
    }

    setIsSubmittingBucket(true)
    setError('')

    try {
      await createSavingsBucket({
        allocationPercentage: Number(allocationPercentage || 0),
        linkedAccountId: linkedAccountId || null,
        name: bucketName,
        targetAmount: Number(targetAmount || 0),
        targetDate: targetDate || null,
        workspaceId: selectedWorkspace.id,
      })
      setBucketName('')
      setTargetAmount('')
      setAllocationPercentage('')
      setTargetDate('')
      setActiveModal(null)
      await loadPageData()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create bucket.')
    } finally {
      setIsSubmittingBucket(false)
    }
  }

  const handleAllocateSavings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedWorkspace) {
      return
    }

    setIsSubmittingAllocation(true)
    setError('')

    try {
      await createSavingsAllocation({
        amount: Number(allocationAmount),
        bucketId,
        date: allocationDate,
        notes: allocationNotes,
        sourceAccountId,
        workspaceId: selectedWorkspace.id,
      })
      setAllocationAmount('')
      setAllocationNotes('')
      setActiveModal(null)
      await loadPageData()
    } catch (allocationError) {
      setError(
        allocationError instanceof Error
          ? allocationError.message
          : 'Unable to allocate savings.',
      )
    } finally {
      setIsSubmittingAllocation(false)
    }
  }

  const handleArchiveBucket = async (bucketIdToArchive: string) => {
    setArchivingBucketId(bucketIdToArchive)
    setError('')

    try {
      await archiveSavingsBucket(bucketIdToArchive)
      await loadPageData()
    } catch (archiveError) {
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : 'Unable to archive savings bucket.',
      )
    } finally {
      setArchivingBucketId('')
    }
  }

  const handleSaveBucket = async () => {
    if (!editingBucket) {
      return
    }

    setSavingBucketId(editingBucket.bucketId)
    setError('')

    try {
      await updateSavingsBucket({
        allocationPercentage: Number(editingBucket.allocationPercentage || 0),
        bucketId: editingBucket.bucketId,
        linkedAccountId: editingBucket.linkedAccountId || null,
        name: editingBucket.name,
        targetAmount: Number(editingBucket.targetAmount || 0),
        targetDate: editingBucket.targetDate || null,
      })
      setEditingBucket(null)
      await loadPageData()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update savings bucket.')
    } finally {
      setSavingBucketId('')
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Phase 6 foundation</p>
          <h1>Savings buckets</h1>
          <p className="lead">
            Create target funds, connect them to accounts, and record real ledger-backed allocations.
          </p>
        </div>
      </header>

      {error && <p className="form-error">{error}</p>}

      {!selectedWorkspace ? (
        <p className="empty-state">Create a space before setting up savings buckets.</p>
      ) : (
        <>
          <section className="metric-grid metric-grid-compact">
            <Card>
              <CardHeader>
                <PiggyBank aria-hidden="true" size={20} />
                <h2>Total bucket balance</h2>
              </CardHeader>
              <CardContent>
                <p className="metric-value">
                  {formatCurrency(totalAllocated, selectedWorkspace.currency)}
                </p>
              </CardContent>
            </Card>
          </section>

          <section className="list-panel">
            <div className="section-heading">
              <h2>Active buckets</h2>
              <span className="inline-actions">
                <span>{isLoading ? 'Loading' : `${buckets.length} active`}</span>
                <Button onClick={() => setActiveModal('bucket')} type="button">
                  <Plus aria-hidden="true" size={18} />
                  Create bucket
                </Button>
                <Button onClick={() => setActiveModal('allocation')} type="button" variant="secondary">
                  <ArrowRightLeft aria-hidden="true" size={18} />
                  Allocate
                </Button>
              </span>
            </div>

            {buckets.length === 0 && !isLoading ? (
              <p className="empty-state">No savings buckets yet. Create one to start tracking goals.</p>
            ) : (
              <div className="record-list">
                {buckets.map((bucket) => {
                  const linkedAccount = accounts.find((account) => account.id === bucket.linked_account_id)
                  const progress = calculateGoalProgress(bucket.current_amount, bucket.target_amount)

                  return (
                    <div className="record-row record-row-stack" key={bucket.id}>
                      {editingBucket?.bucketId === bucket.id ? (
                        <span className="inline-edit-fields">
                          <Input
                            onChange={(event) =>
                              setEditingBucket({ ...editingBucket, name: event.target.value })
                            }
                            required
                            value={editingBucket.name}
                          />
                          <select
                            className="field-input"
                            onChange={(event) =>
                              setEditingBucket({
                                ...editingBucket,
                                linkedAccountId: event.target.value,
                              })
                            }
                            value={editingBucket.linkedAccountId}
                          >
                            <option value="">No linked account</option>
                            {accounts.map((account) => (
                              <option key={account.id} value={account.id}>
                                {account.name}
                              </option>
                            ))}
                          </select>
                          <Input
                            min="0"
                            onChange={(event) =>
                              setEditingBucket({ ...editingBucket, targetAmount: event.target.value })
                            }
                            step="0.01"
                            type="number"
                            value={editingBucket.targetAmount}
                          />
                          <Input
                            max="100"
                            min="0"
                            onChange={(event) =>
                              setEditingBucket({
                                ...editingBucket,
                                allocationPercentage: event.target.value,
                              })
                            }
                            step="0.01"
                            type="number"
                            value={editingBucket.allocationPercentage}
                          />
                          <Input
                            onChange={(event) =>
                              setEditingBucket({ ...editingBucket, targetDate: event.target.value })
                            }
                            type="date"
                            value={editingBucket.targetDate}
                          />
                        </span>
                      ) : (
                        <span>
                          <strong>{bucket.name}</strong>
                          <small>
                            {linkedAccount?.name ?? 'No linked account'}
                            {bucket.target_date ? ` / target ${bucket.target_date}` : ''}
                          </small>
                          <SyncBadge status={(bucket as { sync_status?: string }).sync_status} />
                        </span>
                      )}
                      <span className="record-row-meta">
                        <strong>
                          {formatCurrency(bucket.current_amount, selectedWorkspace.currency)}
                        </strong>
                        <small>
                          {bucket.target_amount > 0
                            ? `${progress.toFixed(1)}% of ${formatCurrency(bucket.target_amount, selectedWorkspace.currency)}`
                            : `${bucket.allocation_percentage}% suggested allocation`}
                        </small>
                        <span className="inline-actions">
                          {editingBucket?.bucketId === bucket.id ? (
                            <>
                              <Button
                                disabled={savingBucketId === bucket.id}
                                onClick={() => void handleSaveBucket()}
                                type="button"
                                variant="ghost"
                              >
                                <Save aria-hidden="true" size={16} />
                                {savingBucketId === bucket.id ? 'Saving...' : 'Save'}
                              </Button>
                              <Button onClick={() => setEditingBucket(null)} type="button" variant="ghost">
                                <X aria-hidden="true" size={16} />
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <Button
                              onClick={() =>
                                setEditingBucket({
                                  allocationPercentage: String(bucket.allocation_percentage),
                                  bucketId: bucket.id,
                                  linkedAccountId: bucket.linked_account_id ?? '',
                                  name: bucket.name,
                                  targetAmount: String(bucket.target_amount),
                                  targetDate: bucket.target_date ?? '',
                                })
                              }
                              type="button"
                              variant="ghost"
                            >
                              <Pencil aria-hidden="true" size={16} />
                              Edit
                            </Button>
                          )}
                          <Button
                            disabled={archivingBucketId === bucket.id}
                            onClick={() => handleArchiveBucket(bucket.id)}
                            type="button"
                            variant="ghost"
                          >
                            <Archive aria-hidden="true" size={16} />
                            {archivingBucketId === bucket.id ? 'Archiving...' : 'Archive'}
                          </Button>
                        </span>
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <Modal
            description="Create a savings container and optionally link it to an account."
            isOpen={activeModal === 'bucket'}
            onClose={() => setActiveModal(null)}
            title="Create bucket"
          >
            <form className="stack-form" onSubmit={handleCreateBucket}>
              <label className="field-group">
                Bucket name
                <Input
                  onChange={(event) => setBucketName(event.target.value)}
                  placeholder="Emergency fund"
                  required
                  value={bucketName}
                />
              </label>

              <label className="field-group">
                Linked account
                <select
                  className="field-input"
                  onChange={(event) => setLinkedAccountId(event.target.value)}
                  value={linkedAccountId}
                >
                  <option value="">No linked account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field-group">
                Target amount
                <Input
                  min="0"
                  onChange={(event) => setTargetAmount(event.target.value)}
                  step="0.01"
                  type="number"
                  value={targetAmount}
                />
              </label>

              <label className="field-group">
                Suggested allocation percent
                <Input
                  max="100"
                  min="0"
                  onChange={(event) => setAllocationPercentage(event.target.value)}
                  step="0.01"
                  type="number"
                  value={allocationPercentage}
                />
              </label>

              <label className="field-group">
                Target date
                <Input
                  onChange={(event) => setTargetDate(event.target.value)}
                  type="date"
                  value={targetDate}
                />
              </label>

              <Button disabled={isSubmittingBucket} type="submit">
                <Plus aria-hidden="true" size={18} />
                {isSubmittingBucket ? 'Creating...' : 'Create bucket'}
              </Button>
            </form>
          </Modal>

          <Modal
            description="Move money from an account into one of your savings buckets."
            isOpen={activeModal === 'allocation'}
            onClose={() => setActiveModal(null)}
            title="Allocate savings"
          >
            <form className="stack-form" onSubmit={handleAllocateSavings}>
              <label className="field-group">
                Source account
                <select
                  className="field-input"
                  disabled={accounts.length === 0}
                  onChange={(event) => setSourceAccountId(event.target.value)}
                  required
                  value={sourceAccountId}
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field-group">
                Bucket
                <select
                  className="field-input"
                  disabled={buckets.length === 0}
                  onChange={(event) => setBucketId(event.target.value)}
                  required
                  value={bucketId}
                >
                  {buckets.map((bucket) => (
                    <option key={bucket.id} value={bucket.id}>
                      {bucket.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field-group">
                Amount
                <Input
                  min="0.01"
                  onChange={(event) => setAllocationAmount(event.target.value)}
                  required
                  step="0.01"
                  type="number"
                  value={allocationAmount}
                />
              </label>

              <label className="field-group">
                Date
                <Input
                  onChange={(event) => setAllocationDate(event.target.value)}
                  required
                  type="date"
                  value={allocationDate}
                />
              </label>

              <label className="field-group">
                Notes
                <Input
                  onChange={(event) => setAllocationNotes(event.target.value)}
                  placeholder="Set aside part of salary"
                  value={allocationNotes}
                />
              </label>

              <Button
                disabled={isSubmittingAllocation || accounts.length === 0 || buckets.length === 0}
                type="submit"
              >
                <PiggyBank aria-hidden="true" size={18} />
                {isSubmittingAllocation ? 'Allocating...' : 'Allocate to bucket'}
              </Button>
            </form>
          </Modal>
        </>
      )}
    </div>
  )
}
