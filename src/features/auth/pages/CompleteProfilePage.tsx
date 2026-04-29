import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { CircleUserRound } from 'lucide-react'
import { Button, Input } from '../../../components/ui'
import { routes } from '../../../app/routes'
import { updateProfileName } from '../services/authService'
import { AuthFormShell } from '../components/AuthFormShell'

export function CompleteProfilePage() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await updateProfileName(fullName)
      navigate(routes.workspace)
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to save profile.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthFormShell
      description="Add the name shown in your personal and shared spaces."
      eyebrow="Profile"
      footer="You can update this later in settings."
      title="Complete profile"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="field-group">
          Full name
          <Input
            autoComplete="name"
            onChange={(event) => setFullName(event.target.value)}
            required
            type="text"
            value={fullName}
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <Button disabled={isSubmitting} type="submit">
          <CircleUserRound aria-hidden="true" size={18} />
          {isSubmitting ? 'Saving...' : 'Continue'}
        </Button>
      </form>
    </AuthFormShell>
  )
}
