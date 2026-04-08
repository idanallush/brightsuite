import { type ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
  active?: boolean
  onClick?: () => void
}

export const GlassCard = ({ children, className = '', active, onClick }: GlassCardProps) => {
  return (
    <div
      className={`glass-card ${onClick ? 'cursor-pointer' : ''} ${className}`}
      data-active={active}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
