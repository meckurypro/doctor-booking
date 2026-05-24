// src/context/AuthContext.jsx
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase, profiles as profilesApi } from '@/lib/supabase'

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const PROFILE_RETRY_ATTEMPTS = 4
const PROFILE_RETRY_DELAY_MS = 800

// ─────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────

const AuthContext = createContext(null)

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Fetches a profile by userId with exponential-ish retry to handle
 * the race condition where Supabase's DB trigger hasn't created the
 * profile row yet when onAuthStateChange fires SIGNED_IN.
 *
 * Returns { data, isNewUser }
 *   - data      → profile row (or null if genuinely doesn't exist after retries)
 *   - isNewUser → true when every attempt returned nothing (first OAuth signup)
 */
const fetchProfileWithRetry = async (userId) => {
  for (let attempt = 0; attempt < PROFILE_RETRY_ATTEMPTS; attempt++) {
    const { data, error } = await profilesApi.getById(userId)

    if (error) {
      console.error(`AuthContext: fetchProfile attempt ${attempt + 1} error`, error)
    }

    if (data) return { data, isNewUser: false }

    // Don't wait after the last attempt
    if (attempt < PROFILE_RETRY_ATTEMPTS - 1) {
      await sleep(PROFILE_RETRY_DELAY_MS)
    }
  }

  return { data: null, isNewUser: true }
}

// ─────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }) => {
  const [user,             setUser]             = useState(null)
  const [profile,          setProfile]          = useState(null)
  const [loading,          setLoading]          = useState(true)
  const [onboardingNeeded, setOnboardingNeeded] = useState(false)

  // Tracks which userId is currently being loaded to prevent
  // duplicate concurrent fetches for the same user.
  const activeProfileLoad = useRef(null)

  // ── Core: load + apply profile state ──────────────────────
  const loadProfile = useCallback(async (userId) => {
    // De-duplicate: if already loading for this user, bail out
    if (activeProfileLoad.current === userId) return

    activeProfileLoad.current = userId

    try {
      const { data, isNewUser } = await fetchProfileWithRetry(userId)

      // Guard: if the user changed while we were awaiting, discard stale result
      if (activeProfileLoad.current !== userId) return

      if (isNewUser || !data) {
        setProfile(null)
        setOnboardingNeeded(true)
      } else {
        setProfile(data)
        setOnboardingNeeded(!data.onboarding_completed)
      }
    } finally {
      // Always clear the lock for this userId
      if (activeProfileLoad.current === userId) {
        activeProfileLoad.current = null
      }
    }
  }, [])

  // ── Bootstrap: check existing session on mount ─────────────
  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (!mounted) return

        if (error) {
          console.error('AuthContext: getSession error', error)
          return
        }

        if (session?.user) {
          setUser(session.user)
          await loadProfile(session.user.id)
        }
      } catch (err) {
        console.error('AuthContext: unexpected init error', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    init()

    // ── Auth state listener ──────────────────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        switch (event) {
          case 'SIGNED_OUT': {
            setUser(null)
            setProfile(null)
            setOnboardingNeeded(false)
            activeProfileLoad.current = null
            break
          }

          case 'TOKEN_REFRESHED': {
            // Session refreshed silently — user/profile unchanged, nothing to do
            break
          }

          case 'SIGNED_IN':
          case 'USER_UPDATED':
          case 'INITIAL_SESSION': {
            if (session?.user) {
              setUser(session.user)
              await loadProfile(session.user.id)
            }
            break
          }

          // PASSWORD_RECOVERY is handled exclusively by ResetPasswordPage
          default:
            break
        }
      },
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadProfile])

  // ── Public helpers ─────────────────────────────────────────

  /** Re-fetch the profile from DB (e.g. after the user updates their account). */
  const refreshProfile = useCallback(async () => {
    if (!user?.id) return
    // Force a fresh load by clearing the lock first
    activeProfileLoad.current = null
    await loadProfile(user.id)
  }, [user, loadProfile])

  /**
   * Optimistic local update — call immediately after a successful
   * profiles.update() to keep UI in sync without a round-trip.
   */
  const updateProfileLocal = useCallback((updates) => {
    setProfile((prev) => (prev ? { ...prev, ...updates } : prev))
  }, [])

  // ── Context value ──────────────────────────────────────────
  const value = {
    user,
    profile,
    loading,
    onboardingNeeded,
    refreshProfile,
    updateProfileLocal,
    isAdmin: profile?.role === 'admin',
    isStaff: profile?.is_staff === true,
    credits: profile?.credits ?? 0,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an <AuthProvider>')
  return context
}
