import { type TextareaHTMLAttributes, forwardRef } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, className = '', id, ...props }, ref) => {
    const textareaId = id || label?.replace(/\s/g, '-').toLowerCase()

    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-xs font-medium tracking-wider text-text-muted"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`glass-input glass-textarea ${className}`}
          {...props}
        />
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
