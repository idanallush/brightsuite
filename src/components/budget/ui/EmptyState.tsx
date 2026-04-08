import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-text-muted mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-text-secondary max-w-xs mb-6">{description}</p>
      )}
      {action}
    </div>
  )
}
