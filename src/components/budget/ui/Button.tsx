import { type ButtonHTMLAttributes, type ReactNode } from 'react'

type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  children: ReactNode
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  icon: 'btn-icon',
}

export const Button = ({ variant = 'primary', children, className = '', ...props }: ButtonProps) => {
  return (
    <button className={`${variantClass[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
