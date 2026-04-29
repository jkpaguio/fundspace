import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { BadgeDollarSign, Save, WalletCards } from 'lucide-react'
import { PageHeader } from '../../../components/common/PageHeader'
import { Button, Card, CardContent, CardHeader } from '../../../components/ui'
import { currencyOptions } from '../../../constants/options'
import { useWorkspaceOutlet } from '../../../hooks/useWorkspaceOutlet'
import { getCurrentProfile, updateCurrentProfile } from '../../auth/services/authService'
import { updateWorkspaceSettings } from '../../workspaces/services/workspaceService'
import type { CurrencyCode, Profile } from '../../../types/domain'

export function CurrencySettingsPage() {
  const { loadWorkspaces, selectedWorkspace } = useWorkspaceOutlet()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [defaultCurrency, setDefaultCurrency] = useState<CurrencyCode>('PHP')
  const [workspaceCurrency, setWorkspaceCurrency] = useState<CurrencyCode>('PHP')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSavingProfileCurrency, setIsSavingProfileCurrency] = useState(false)
  const [isSavingWorkspaceCurrency, setIsSavingWorkspaceCurrency] = useState(false)

  const loadCurrencySettings = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const nextProfile = await getCurrentProfile()
      setProfile(nextProfile)
      setDefaultCurrency(nextProfile.default_currency)
      setWorkspaceCurrency(selectedWorkspace?.currency ?? nextProfile.default_currency)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load currency settings.')
    } finally {
      setIsLoading(false)
    }
  }, [selectedWorkspace])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCurrencySettings()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadCurrencySettings])

  const handleSaveProfileCurrency = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!profile) {
      return
    }

    setIsSavingProfileCurrency(true)
    setError('')
    setMessage('')

    try {
      await updateCurrentProfile({
        defaultCurrency,
        fullName: profile.full_name ?? '',
      })
      setMessage('Default currency updated.')
      await loadCurrencySettings()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save default currency.')
    } finally {
      setIsSavingProfileCurrency(false)
    }
  }

  const handleSaveWorkspaceCurrency = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedWorkspace) {
      return
    }

    setIsSavingWorkspaceCurrency(true)
    setError('')
    setMessage('')

    try {
      await updateWorkspaceSettings({
        currency: workspaceCurrency,
        name: selectedWorkspace.name,
        type: selectedWorkspace.type,
        workspaceId: selectedWorkspace.id,
      })
      await loadWorkspaces()
      setMessage('Space currency updated.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save space currency.')
    } finally {
      setIsSavingWorkspaceCurrency(false)
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Currency"
        heading="Currency settings"
        lead="Set your personal default currency and adjust the active space currency when needed."
      />

      {error && <p className="form-error">{error}</p>}
      {message && <p className="form-success">{message}</p>}

      <section className="content-grid">
        <Card>
          <CardHeader>
            <BadgeDollarSign aria-hidden="true" size={20} />
            <h2>Personal default</h2>
          </CardHeader>
          <CardContent>
            <form className="stack-form" onSubmit={handleSaveProfileCurrency}>
              <label className="field-group">
                Default currency
                <select
                  className="field-input"
                  disabled={isLoading}
                  onChange={(event) => setDefaultCurrency(event.target.value as CurrencyCode)}
                  value={defaultCurrency}
                >
                  {currencyOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <Button disabled={isLoading || isSavingProfileCurrency || !profile} type="submit">
                <Save aria-hidden="true" size={18} />
                {isSavingProfileCurrency ? 'Saving...' : 'Save default currency'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <WalletCards aria-hidden="true" size={20} />
            <h2>Active space</h2>
          </CardHeader>
          <CardContent>
            {!selectedWorkspace ? (
              <p className="empty-state">Select a space before changing its currency.</p>
            ) : (
              <form className="stack-form" onSubmit={handleSaveWorkspaceCurrency}>
                <div className="record-row record-row-stack">
                  <span>
                    <strong>{selectedWorkspace.name}</strong>
                    <small>{selectedWorkspace.type.replace('_', ' ')}</small>
                  </span>
                  <span className="badge">{selectedWorkspace.currency}</span>
                </div>

                <label className="field-group">
                  Space currency
                  <select
                    className="field-input"
                    disabled={isLoading}
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

                <Button disabled={isLoading || isSavingWorkspaceCurrency} type="submit">
                  <Save aria-hidden="true" size={18} />
                  {isSavingWorkspaceCurrency ? 'Saving...' : 'Save space currency'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
