import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { Button, Input } from '../../../components/ui'
import { PasswordInput } from '../../../components/common/PasswordInput'
import { routes } from '../../../app/routes'
import { signInWithEmail } from '../services/authService'
import { AuthFormShell } from '../components/AuthFormShell'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    const { error: signInError } = await signInWithEmail(email, password)

    setIsSubmitting(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    navigate(routes.workspace)
  }

  return (
    <AuthFormShell
      description="Your money, plans, and progress are right here. Let’s pick up where you left off."
      eyebrow="Welcome back"
      footer={
        <>
          <Link to={routes.forgotPassword}>Forgot password?</Link>
          <span>
            New here? <Link to={routes.register}>Create an account</Link>
          </span>
        </>
      }
      title="Welcome to your space."
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
            autoComplete="current-password"
            placeholder="Enter your password"
            minLength={6}
            onChange={(event) => setPassword(event.target.value)}
            required
            value={password}
          />
        </label>

        {error && <p className="form-error" role="alert">{error}</p>}

        <Button disabled={isSubmitting} type="submit">
          <LogIn aria-hidden="true" size={18} />
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </AuthFormShell>
  )
}
