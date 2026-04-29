import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { NavLink } from 'react-router-dom'
import { BadgeDollarSign, CircleUserRound, KeyRound, MonitorCog, Settings2, Users } from 'lucide-react'
import { PageHeader } from '../../../components/common/PageHeader'
import { ThemeToggle } from '../../../components/common/ThemeToggle'
import { Button, Card, CardContent, CardHeader, Input } from '../../../components/ui'
import { currencyOptions } from '../../../constants/options'
import { useAuthSession } from '../../../hooks/useAuthSession'
import { useThemePreference } from '../../../hooks/useThemePreference'
import { routes } from '../../../app/routes'
import { getCurrentProfile, updateCurrentPassword, updateCurrentProfile } from '../../auth/services/authService'
import type { CurrencyCode, Profile } from '../../../types/domain'

export function SettingsPage() {
  const { session } = useAuthSession()
  const { theme, toggleTheme } = useThemePreference()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState('')
  const [defaultCurrency, setDefaultCurrency] = useState<CurrencyCode>('PHP')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [profileError, setProfileError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [profileMessage, setProfileMessage] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  const loadProfile = useCallback(async () => {
    setIsLoading(true)
    setProfileError('')

    try {
      const nextProfile = await getCurrentProfile()
      setProfile(nextProfile)
      setFullName(nextProfile.full_name ?? '')
      setDefaultCurrency(nextProfile.default_currency)
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Unable to load profile settings.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProfile()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadProfile])

  const handleSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSavingProfile(true)
    setProfileError('')
    setProfileMessage('')

    try {
      await updateCurrentProfile({
        defaultCurrency,
        fullName,
      })
      setProfileMessage('Profile settings updated.')
      await loadProfile()
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Unable to save profile settings.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleUpdatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPasswordError('')
    setPasswordMessage('')

    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    setIsSavingPassword(true)

    try {
      const { error } = await updateCurrentPassword(password)

      if (error) {
        setPasswordError(error.message)
        return
      }

      setPassword('')
      setConfirmPassword('')
      setPasswordMessage('Password updated.')
    } finally {
      setIsSavingPassword(false)
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Settings"
        heading="Profile and app settings"
        lead="Update your personal profile, preferred currency, and account security from one place."
      />

      <section className="settings-link-grid">
        <NavLink className="settings-link-card" to={routes.currencySettings}>
          <BadgeDollarSign aria-hidden="true" size={20} />
          <span>
            <strong>Currency settings</strong>
            <small>Default and active space currency</small>
          </span>
        </NavLink>
        <NavLink className="settings-link-card" to={routes.workspaceSettings}>
          <Users aria-hidden="true" size={20} />
          <span>
            <strong>Space settings</strong>
            <small>Identity, access, and members</small>
          </span>
        </NavLink>
      </section>

      <section className="content-grid">
        <Card>
          <CardHeader>
            <CircleUserRound aria-hidden="true" size={20} />
            <h2>Profile</h2>
          </CardHeader>
          <CardContent>
            <form className="stack-form" onSubmit={handleSaveProfile}>
              <label className="field-group">
                Full name
                <Input
                  onChange={(event) => setFullName(event.target.value)}
                  required
                  type="text"
                  value={fullName}
                />
              </label>

              <label className="field-group">
                Email
                <Input disabled type="email" value={session?.user.email ?? ''} />
              </label>

              <label className="field-group">
                Default currency
                <select
                  className="field-input"
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

              {profileError && <p className="form-error">{profileError}</p>}
              {profileMessage && <p className="form-success">{profileMessage}</p>}

              <Button disabled={isSavingProfile || isLoading} type="submit">
                <Settings2 aria-hidden="true" size={18} />
                {isSavingProfile ? 'Saving...' : 'Save profile'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <KeyRound aria-hidden="true" size={20} />
            <h2>Security</h2>
          </CardHeader>
          <CardContent>
            <form className="stack-form" onSubmit={handleUpdatePassword}>
              <label className="field-group">
                New password
                <Input
                  minLength={6}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </label>

              <label className="field-group">
                Confirm password
                <Input
                  minLength={6}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  type="password"
                  value={confirmPassword}
                />
              </label>

              {passwordError && <p className="form-error">{passwordError}</p>}
              {passwordMessage && <p className="form-success">{passwordMessage}</p>}

              <Button disabled={isSavingPassword} type="submit">
                <KeyRound aria-hidden="true" size={18} />
                {isSavingPassword ? 'Updating...' : 'Update password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <MonitorCog aria-hidden="true" size={20} />
          <h2>Appearance</h2>
        </CardHeader>
        <CardContent>
          <div className="record-list">
            <div className="record-row">
              <span>
                <strong>Theme preference</strong>
                <small>Saved on this device</small>
              </span>
              <span className="inline-actions">
                <strong>{theme}</strong>
                <ThemeToggle onToggle={toggleTheme} theme={theme} />
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Settings2 aria-hidden="true" size={20} />
          <h2>Account details</h2>
        </CardHeader>
        <CardContent>
          <div className="record-list">
            <div className="record-row">
              <span>
                <strong>Account email</strong>
                <small>Current signed-in account</small>
              </span>
              <span>{session?.user.email ?? 'No email found'}</span>
            </div>
            <div className="record-row">
              <span>
                <strong>Profile created</strong>
                <small>Initial account creation date</small>
              </span>
              <span>{profile ? new Date(profile.created_at).toLocaleDateString() : 'Loading...'}</span>
            </div>
            <div className="record-row">
              <span>
                <strong>Last profile update</strong>
                <small>Most recent profile settings change</small>
              </span>
              <span>{profile ? new Date(profile.updated_at).toLocaleString() : 'Loading...'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
