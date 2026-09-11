import React from 'react'

interface PageHeaderProps {
  title: string
  badge?: string
  badgeVariant?: 'default' | 'success' | 'info' | 'warning'
  subtitle?: string
  kicker?: string
  actions?: React.ReactNode
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, badge, subtitle, actions }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-pad-md pb-pad-md">
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight">
            {title}
          </h1>
          {badge && (
            <span className="font-mono-numeric-sm text-mono-numeric-sm bg-surface-container px-2 py-0.5 rounded-DEFAULT text-on-surface-variant uppercase">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{subtitle}</p>
        )}
      </div>

      {actions && <div className="flex items-center gap-pad-xs flex-wrap">{actions}</div>}
    </div>
  )
}
