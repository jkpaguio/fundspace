import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, Input } from '../../../components/ui'
import { accountTypeOptions } from '../../../constants/options'
import { formatCurrency } from '../../../lib/formatCurrency'
import type { Account, AccountType } from '../../../types/domain'
import { useWorkspaceOutlet } from '../../../hooks/useWorkspaceOutlet'
import { createAccount, listAccounts } from '../services/accountService'

export function AccountsPage() {
  const { selectedWorkspace } = useWorkspaceOutlet()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('cash')
  const [startingBalance, setStartingBalance] = useState('0')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

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
      await loadAccounts()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create account.')
    } finally {
      setIsCreating(false)
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
      <header className="page-header">
        <div>
          <p className="eyebrow">Accounts</p>
          <h1>Where money is stored</h1>
          <p className="lead">Create wallets, bank accounts, savings containers, and business capital accounts.</p>
        </div>
      </header>

      {error && <p className="form-error">{error}</p>}

      {!selectedWorkspace ? (
        <p className="empty-state">Create a workspace before adding accounts.</p>
      ) : (
        <section className="content-grid">
          <Card>
            <CardHeader>
              <Plus aria-hidden="true" size={20} />
              <h2>Add account</h2>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          <section className="list-panel">
            <div className="section-heading">
              <h2>Account list</h2>
              <span>{isLoading ? 'Loading' : `${accounts.length} active`}</span>
            </div>

            {accounts.length === 0 && !isLoading ? (
              <p className="empty-state">No accounts yet. Add your first wallet or bank account.</p>
            ) : (
              <div className="record-list">
                {accounts.map((account) => (
                  <div className="record-row" key={account.id}>
                    <span>
                      <strong>{account.name}</strong>
                      <small>{account.type}</small>
                    </span>
                    <span>{formatCurrency(account.current_balance, account.currency)}</span>
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
