import { useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '../ui'

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <span className="password-input-shell">
      <Input
        className={className}
        type={isVisible ? 'text' : 'password'}
        {...props}
      />
      <button
        aria-label={isVisible ? 'Hide password' : 'Show password'}
        className="password-toggle-button"
        onClick={() => setIsVisible((current) => !current)}
        type="button"
      >
        {isVisible ? (
          <EyeOff aria-hidden="true" size={18} />
        ) : (
          <Eye aria-hidden="true" size={18} />
        )}
      </button>
    </span>
  )
}
