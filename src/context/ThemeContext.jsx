import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('system')
  const [resolvedTheme, setResolvedTheme] = useState('dark')

  // Apply theme to document
  const applyTheme = (resolved) => {
    const root = document.documentElement
    if (resolved === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    setResolvedTheme(resolved)
  }

  // Initialize theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('meckury-theme') || 'system'
    setTheme(saved)

    if (saved === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      applyTheme(prefersDark ? 'dark' : 'light')
    } else {
      applyTheme(saved)
    }
  }, [])

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => applyTheme(e.matches ? 'dark' : 'light')

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [theme])

  const setThemePreference = (newTheme) => {
    setTheme(newTheme)
    localStorage.setItem('meckury-theme', newTheme)

    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      applyTheme(prefersDark ? 'dark' : 'light')
    } else {
      applyTheme(newTheme)
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme: setThemePreference }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
