import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, className = '', id, ...props }, ref) => {
    const inputId = id || label?.replace(/\s/g, '-').toLowerCase()

    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium tracking-wider text-text-muted"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`glass-input ${className}`}
          {...props}
        />
      </div>
    )
  }
)

Input.displayName = 'Input'
