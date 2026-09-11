import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { Button, Input } from '../../../components/ui'
import { PasswordInput } from '../../../components/common/PasswordInput'
import { routes } from '../../../app/routes'
import { signUpWithEmail } from '../services/authService'
import { AuthFormShell } from '../components/AuthFormShell'

export function RegisterPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setIsSubmitting(true)

    const { error: signUpError } = await signUpWithEmail(email, password)

    setIsSubmitting(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    setMessage('Account created. Check your email if confirmation is enabled.')
    navigate(routes.completeProfile)
  }

  return (
    <AuthFormShell
      description="A little less guesswork starts here. Create an account and make your first money space."
      eyebrow="Start something good"
      footer={
        <span>
          Already have an account? <Link to={routes.login}>Log in</Link>
        </span>
      }
      title="Make room for more."
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="field-group">
          Email
          <Input
            autoComplete="email"
            placeholder="you@example.com"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>

        <label className="field-group">
          Password
          <PasswordInput
            autoComplete="new-password"
            placeholder="Create your password"
            aria-describedby="register-password-hint"
            minLength={6}
            onChange={(event) => setPassword(event.target.value)}
            required
            value={password}
          />
          <span className="field-helper" id="register-password-hint">Use at least 6 characters.</span>
        </label>

        {error && <p className="form-error" role="alert">{error}</p>}
        {message && <p className="form-success" role="status">{message}</p>}

        <Button disabled={isSubmitting} type="submit">
          <UserPlus aria-hidden="true" size={18} />
          {isSubmitting ? 'Creating...' : 'Create account'}
        </Button>
      </form>
    </AuthFormShell>
  )
}
