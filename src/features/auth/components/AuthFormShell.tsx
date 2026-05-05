import type { ReactNode } from 'react'

type AuthFormShellProps = {
  children: ReactNode
  description: string
  eyebrow: string
  footer: ReactNode
  supportPoints?: string[]
  title: string
}

export function AuthFormShell({
  children,
  description,
  eyebrow,
  footer,
  supportPoints = [],
  title,
}: AuthFormShellProps) {
  return (
    <div className="auth-form-shell">
      <div className="auth-form-heading">
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="section-description">{description}</p>
      </div>

      {supportPoints.length > 0 && (
        <div className="auth-support-list">
          {supportPoints.map((point) => (
            <span className="badge" key={point}>
              {point}
            </span>
          ))}
        </div>
      )}

      {children}

      <div className="auth-form-footer">{footer}</div>
    </div>
  )
}
