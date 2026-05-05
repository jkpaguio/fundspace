import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Archive, Pencil, Plus, Save, X } from 'lucide-react'
import { EmptyState } from '../../../components/common/EmptyState'
import { PageHeader } from '../../../components/common/PageHeader'
import { SyncBadge } from '../../../components/common/SyncBadge'
import { Button, Input, Modal } from '../../../components/ui'
import { accountTypeOptions } from '../../../constants/options'
import { formatCurrency } from '../../../lib/formatCurrency'
import type { Account, AccountType } from '../../../types/domain'
import { useWorkspaceOutlet } from '../../../hooks/useWorkspaceOutlet'
import { archiveAccount, createAccount, listAccounts, updateAccount } from '../services/accountService'

type AccountEditDraft = {
  accountId: string
  name: string
  type: AccountType
}

export function AccountsPage() {
  const { selectedWorkspace } = useWorkspaceOutlet()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('cash')
  const [startingBalance, setStartingBalance] = useState('0')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [archivingAccountId, setArchivingAccountId] = useState('')
  const [editingAccount, setEditingAccount] = useState<AccountEditDraft | null>(null)
  const [savingAccountId, setSavingAccountId] = useState('')

  const loadAccounts = useCallback(async () => {
    if (!selectedWorkspace) {
      return
    }

    setIsLoading(true)
    setError('')

    try {
      setAccounts(await listAccounts(selectedWorkspace.id))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load accounts.')
    } finally {
      setIsLoading(false)
    }
  }, [selectedWorkspace])

  const handleCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedWorkspace) {
      return
    }

    setIsCreating(true)
    setError('')

    try {
      await createAccount({
        currency: selectedWorkspace.currency,
        name,
        startingBalance: Number(startingBalance),
        type,
        workspaceId: selectedWorkspace.id,
      })
      setName('')
      setStartingBalance('0')
      setIsCreateModalOpen(false)
      await loadAccounts()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create account.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleArchiveAccount = async (accountId: string) => {
    setArchivingAccountId(accountId)
    setError('')

    try {
      await archiveAccount(accountId)
      await loadAccounts()
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : 'Unable to archive account.')
    } finally {
      setArchivingAccountId('')
    }
  }

  const handleSaveAccount = async () => {
    if (!editingAccount) {
      return
    }

    setSavingAccountId(editingAccount.accountId)
    setError('')

    try {
      await updateAccount(editingAccount)
      setEditingAccount(null)
      await loadAccounts()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update account.')
    } finally {
      setSavingAccountId('')
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAccounts()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadAccounts])

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Accounts"
        heading="Where money is stored"
        lead="Create wallets, bank accounts, savings containers, and business capital accounts."
      />

      {error && <p className="form-error">{error}</p>}

      {!selectedWorkspace ? (
        <EmptyState
          description="Choose or create a space first so new accounts are attached to the right ledger."
          title="Start with a space"
        />
      ) : (
        <>
          <section className="list-panel">
            <div className="section-heading">
              <h2>Account list</h2>
              <span className="inline-actions">
                <span>{isLoading ? 'Loading' : `${accounts.length} active`}</span>
                <Button onClick={() => setIsCreateModalOpen(true)} type="button">
                  <Plus aria-hidden="true" size={18} />
                  Add account
                </Button>
              </span>
            </div>

            {accounts.length === 0 && !isLoading ? (
              <EmptyState
                description="Add a wallet, bank account, or savings container so transactions have a place to land."
                title="Your account list is empty"
              />
            ) : (
              <div className="record-list">
                {accounts.map((account) => (
                  <div className="record-row" key={account.id}>
                    {editingAccount?.accountId === account.id ? (
                      <span className="inline-edit-fields">
                        <Input
                          onChange={(event) =>
                            setEditingAccount({ ...editingAccount, name: event.target.value })
                          }
                          required
                          value={editingAccount.name}
                        />
                        <select
                          className="field-input"
                          onChange={(event) =>
                            setEditingAccount({
                              ...editingAccount,
                              type: event.target.value as AccountType,
                            })
                          }
                          value={editingAccount.type}
                        >
                          {accountTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </span>
                    ) : (
                      <span>
                        <strong>{account.name}</strong>
                        <small>{account.type}</small>
                        <SyncBadge status={(account as { sync_status?: string }).sync_status} />
                      </span>
                    )}
                    <span className="inline-actions">
                      <strong>{formatCurrency(account.current_balance, account.currency)}</strong>
                      {editingAccount?.accountId === account.id ? (
                        <>
                          <Button
                            disabled={savingAccountId === account.id}
                            onClick={() => void handleSaveAccount()}
                            type="button"
                            variant="ghost"
                          >
                            <Save aria-hidden="true" size={16} />
                            {savingAccountId === account.id ? 'Saving...' : 'Save'}
                          </Button>
                          <Button onClick={() => setEditingAccount(null)} type="button" variant="ghost">
                            <X aria-hidden="true" size={16} />
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={() =>
                            setEditingAccount({
                              accountId: account.id,
                              name: account.name,
                              type: account.type,
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
                        disabled={archivingAccountId === account.id}
                        onClick={() => handleArchiveAccount(account.id)}
                        type="button"
                        variant="ghost"
                      >
                        <Archive aria-hidden="true" size={16} />
                        {archivingAccountId === account.id ? 'Archiving...' : 'Archive'}
                      </Button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Modal
            description="Create a wallet, bank account, savings container, or business capital account."
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            title="Add account"
          >
            <form className="stack-form" onSubmit={handleCreateAccount}>
              <label className="field-group">
                Name
                <Input
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Cash Wallet"
                  required
                  value={name}
                />
              </label>

              <label className="field-group">
                Type
                <select
                  className="field-input"
                  onChange={(event) => setType(event.target.value as AccountType)}
                  value={type}
                >
                  {accountTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field-group">
                Starting balance
                <Input
                  min="0"
                  onChange={(event) => setStartingBalance(event.target.value)}
                  required
                  step="0.01"
                  type="number"
                  value={startingBalance}
                />
              </label>

              <Button disabled={isCreating} type="submit">
                <Plus aria-hidden="true" size={18} />
                {isCreating ? 'Adding...' : 'Add account'}
              </Button>
            </form>
          </Modal>
        </>
      )}
    </div>
  )
}
