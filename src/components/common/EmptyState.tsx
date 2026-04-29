import type { ReactNode } from 'react'

type EmptyStateProps = {
  action?: ReactNode
  description: string
  title: string
}

export function EmptyState({ action, description, title }: EmptyStateProps) {
  return (
    <section className="empty-state-card">
      <p className="eyebrow">Getting started</p>
      <h2>{title}</h2>
      <p className="empty-state">{description}</p>
      {action ? <div className="empty-state-actions">{action}</div> : null}
    </section>
  )
}
