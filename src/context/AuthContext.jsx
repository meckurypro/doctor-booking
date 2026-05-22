import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, auth, profiles } from '@/lib/supabase'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [onboardingNeeded, setOnboardingNeeded] = useState(false)

  // Load profile
  const loadProfile = async (userId) => {
    const { data } = await profiles.getById(userId)
    if (data) {
      setProfile(data)
      setOnboardingNeeded(!data.onboarding_completed)
    }
    return data
  }

  // Initialize auth state
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

    // Listen for auth changes
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

        if (event === 'PASSWORD_RECOVERY') {
          // Handle password recovery redirect
          window.location.href = '/auth/reset-password'
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Refresh profile (after credit purchase, etc.)
  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id)
    }
  }

  // Update profile locally (optimistic update)
  const updateProfileLocal = (updates) => {
    setProfile(prev => ({ ...prev, ...updates }))
  }

  const value = {
    user,
    profile,
    loading,
    onboardingNeeded,
    refreshProfile,
    updateProfileLocal,
    isAdmin: profile?.role === 'admin',
    credits: profile?.credits || 0,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
