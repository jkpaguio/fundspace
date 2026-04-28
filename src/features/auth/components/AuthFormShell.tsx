import type { ReactNode } from 'react'

type AuthFormShellProps = {
  children: ReactNode
  description: string
  eyebrow: string
  footer: ReactNode
  title: string
}

export function AuthFormShell({
  children,
  description,
  eyebrow,
  footer,
  title,
}: AuthFormShellProps) {
  return (
    <div className="auth-form-shell">
      <div className="auth-form-heading">
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      {children}

      <div className="auth-form-footer">{footer}</div>
    </div>
  )
}
