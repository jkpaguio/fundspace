import { useLocation } from 'react-router-dom'
import { routeLabels } from '../../app/routes'

type PageHeaderProps = {
  eyebrow: string
  heading: string
  lead: string
}

export function PageHeader({ eyebrow, heading, lead }: PageHeaderProps) {
  const location = useLocation()
  const currentLabel = routeLabels[location.pathname] ?? heading

  return (
    <header className="page-header">
      <div className="page-header-copy">
        <div className="page-breadcrumbs" aria-label="Page context">
          <span>FundSpace</span>
          <span aria-hidden="true">/</span>
          <span>{currentLabel}</span>
        </div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{heading}</h1>
        <p className="lead">{lead}</p>
      </div>
    </header>
  )
}
