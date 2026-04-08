import type { ReactNode } from 'react'

interface MetricCardProps {
  label: string
  value: string
  icon?: ReactNode
  change?: number
  className?: string
}

export const MetricCard = ({ label, value, icon, change, className = '' }: MetricCardProps) => {
  return (
    <div className={`glass-card p-5 ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-text-muted tracking-wider mb-2">
            {label}
          </p>
          <p className="text-2xl font-semibold leading-tight">{value}</p>
        </div>
        {icon && (
          <div className="text-text-secondary">{icon}</div>
        )}
      </div>
      {change !== undefined && (
        <div className="mt-3">
          <span
            className={`chip text-xs ${
              change >= 0 ? 'status-active' : 'status-stopped'
            }`}
          >
            {change >= 0 ? '+' : ''}{change.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  )
}
