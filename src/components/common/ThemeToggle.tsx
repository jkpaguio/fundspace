import { Moon, Sun } from 'lucide-react'
import { Button } from '../ui'
import type { ThemePreference } from '../../hooks/useThemePreference'

type ThemeToggleProps = {
  compact?: boolean
  onToggle: () => void
  theme: ThemePreference
}

export function ThemeToggle({ compact = false, onToggle, theme }: ThemeToggleProps) {
  const isDark = theme === 'dark'
  const Icon = isDark ? Sun : Moon

  return (
    <Button
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={`theme-toggle ${compact ? 'theme-toggle-compact' : ''}`}
      onClick={onToggle}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      type="button"
      variant="ghost"
    >
      <Icon aria-hidden="true" size={16} />
      {!compact && (isDark ? 'Light' : 'Dark')}
    </Button>
  )
}
