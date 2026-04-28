import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { Button, Input } from '../../../components/ui'
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
      description="Sign in to continue tracking your workspaces, balances, and money movement."
      eyebrow="Welcome back"
      footer={
        <>
          <Link to={routes.forgotPassword}>Forgot password?</Link>
          <span>
            New here? <Link to={routes.register}>Create an account</Link>
          </span>
        </>
      }
      title="Log in"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="field-group">
          Email
          <Input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>

        <label className="field-group">
          Password
          <Input
            autoComplete="current-password"
            minLength={6}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <Button disabled={isSubmitting} type="submit">
          <LogIn aria-hidden="true" size={18} />
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </AuthFormShell>
  )
}
