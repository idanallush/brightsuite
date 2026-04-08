import { type SelectHTMLAttributes, type ReactNode, forwardRef } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  children: ReactNode
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, children, className = '', id, ...props }, ref) => {
    const selectId = id || label?.replace(/\s/g, '-').toLowerCase()

    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label
            htmlFor={selectId}
            className="text-xs font-medium tracking-wider text-text-muted"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`glass-input ${className}`}
          {...props}
        >
          {children}
        </select>
      </div>
    )
  }
)

Select.displayName = 'Select'
