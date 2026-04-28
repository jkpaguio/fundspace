import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { Button, Input } from '../../../components/ui'
import { routes } from '../../../app/routes'
import { sendPasswordReset } from '../services/authService'
import { AuthFormShell } from '../components/AuthFormShell'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setIsSubmitting(true)

    const { error: resetError } = await sendPasswordReset(email)

    setIsSubmitting(false)

    if (resetError) {
      setError(resetError.message)
      return
    }

    setMessage('Password reset instructions sent if the email exists.')
  }

  return (
    <AuthFormShell
      description="Enter your account email and Supabase will send recovery instructions."
      eyebrow="Account recovery"
      footer={<Link to={routes.login}>Back to login</Link>}
      title="Reset password"
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

        {error && <p className="form-error">{error}</p>}
        {message && <p className="form-success">{message}</p>}

        <Button disabled={isSubmitting} type="submit">
          <Mail aria-hidden="true" size={18} />
          {isSubmitting ? 'Sending...' : 'Send reset email'}
        </Button>
      </form>
    </AuthFormShell>
  )
}
