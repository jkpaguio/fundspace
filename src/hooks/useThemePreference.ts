import { useEffect, useState } from 'react'

export type ThemePreference = 'dark' | 'light'

const storageKey = 'fundspace-theme'

function resolveInitialTheme(): ThemePreference {
  const storedTheme = window.localStorage.getItem(storageKey)

  if (storedTheme === 'dark' || storedTheme === 'light') {
    return storedTheme
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useThemePreference() {
  const [theme, setTheme] = useState<ThemePreference>(resolveInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    window.localStorage.setItem(storageKey, theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))
  }

  return {
    logoSrc: theme === 'dark' ? '/fundspace-logo-dark.svg' : '/fundspace-logo-light.svg',
    setTheme,
    theme,
    toggleTheme,
  }
}
