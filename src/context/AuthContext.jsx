// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { profiles as profilesApi } from '@/lib/supabase'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user,             setUser]             = useState(null)
  const [profile,          setProfile]          = useState(null)
  const [loading,          setLoading]          = useState(true)
  const [onboardingNeeded, setOnboardingNeeded] = useState(false)

  // Prevent concurrent profile loads for the same user
  const loadingProfileFor = useRef(null)

  // ── Load profile from DB ─────────────────────────────────
  const loadProfile = async (userId) => {
    if (loadingProfileFor.current === userId) return
    loadingProfileFor.current = userId

    const { data, error } = await profilesApi.getById(userId)

    // Clear lock only if still loading for the same user
    if (loadingProfileFor.current === userId) {
      loadingProfileFor.current = null
    }

    if (error || !data) {
      // Profile row may not exist yet (race condition on first OAuth signup)
      // — clear onboarding so AuthPage shows SET_PROFILE
      setProfile(null)
      setOnboardingNeeded(true)
      return null
    }

    setProfile(data)
    setOnboardingNeeded(!data.onboarding_completed)
    return data
  }

  // ── Bootstrap on mount ───────────────────────────────────
  useEffect(() => {
    let mounted = true

    const init = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (!mounted) return

      if (error) {
        console.error('AuthContext: getSession error', error)
        setLoading(false)
        return
      }

      if (session?.user) {
        setUser(session.user)
        await loadProfile(session.user.id)
      }

      setLoading(false)
    }

    init()

    // ── Auth state listener ──────────────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          setOnboardingNeeded(false)
          loadingProfileFor.current = null
          return
        }

        if (session?.user) {
          setUser(session.user)

          // TOKEN_REFRESHED — no need to reload profile
          if (event === 'TOKEN_REFRESHED') return

          // SIGNED_IN / USER_UPDATED / INITIAL_SESSION — reload profile
          await loadProfile(session.user.id)
        }

        // PASSWORD_RECOVERY is handled exclusively by ResetPasswordPage.
      },
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // ── Public helpers ────────────────────────────────────────
  const refreshProfile = async () => {
    if (!user) return
    await loadProfile(user.id)
  }

  // Optimistic local update — call immediately after profiles.update() succeeds
  const updateProfileLocal = (updates) => {
    setProfile((prev) => (prev ? { ...prev, ...updates } : prev))
  }

  // ── Context value ─────────────────────────────────────────
  const value = {
    user,
    profile,
    loading,
    onboardingNeeded,
    refreshProfile,
    updateProfileLocal,
    isAdmin:  profile?.role === 'admin',
    isStaff:  profile?.is_staff === true,
    credits:  profile?.credits ?? 0,
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
