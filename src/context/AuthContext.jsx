// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, auth, profiles } from '@/lib/supabase'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user,             setUser]             = useState(null)
  const [profile,          setProfile]          = useState(null)
  const [loading,          setLoading]          = useState(true)
  const [onboardingNeeded, setOnboardingNeeded] = useState(false)

  const loadProfile = async (userId) => {
    const { data } = await profiles.getById(userId)
    if (data) {
      setProfile(data)
      setOnboardingNeeded(!data.onboarding_completed)
    }
    return data
  }

  useEffect(() => {
    const initAuth = async () => {
      const { session } = await auth.getSession()
      if (session?.user) {
        setUser(session.user)
        await loadProfile(session.user.id)
      }
      setLoading(false)
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          await loadProfile(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
          setOnboardingNeeded(false)
        }
        // PASSWORD_RECOVERY is handled by ResetPasswordPage's own listener.
        // No redirect here — avoids blowing away React Router state.
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id)
  }

  // Optimistic local update — call after profiles.update() succeeds
  const updateProfileLocal = (updates) => {
    setProfile((prev) => ({ ...prev, ...updates }))
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      onboardingNeeded,
      refreshProfile,
      updateProfileLocal,
      isAdmin: profile?.role === 'admin',
      credits: profile?.credits || 0,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
