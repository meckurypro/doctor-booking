// src/context/AuthContext.jsx
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase, profiles as profilesApi } from '@/lib/supabase'

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const PROFILE_RETRY_ATTEMPTS = 4
const PROFILE_RETRY_DELAY_MS = 800

// OAuth providers that auto-populate display_name + avatar_url via
// the DB trigger, so those users never need the onboarding flow.
const OAUTH_PROVIDERS = new Set(['google', 'github', 'facebook', 'apple'])

// ─────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────

const AuthContext = createContext(null)

// ─────────────────────────────────────────────────────────────
// Pure helpers (no React deps — safe to define at module scope)
// ─────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Fetches a profile by userId, retrying up to PROFILE_RETRY_ATTEMPTS times
 * to handle the race condition where Supabase's DB trigger hasn't yet created
 * the row when onAuthStateChange fires SIGNED_IN.
 *
 * @returns {{ data: object|null, isNewUser: boolean }}
 */
const fetchProfileWithRetry = async (userId) => {
  for (let attempt = 0; attempt < PROFILE_RETRY_ATTEMPTS; attempt++) {
    const { data, error } = await profilesApi.getById(userId)

    if (data) return { data, isNewUser: false }

    // Log real errors (not "row not found") for observability
    if (error && error.code !== 'PGRST116') {
      console.error(`AuthContext: fetchProfile attempt ${attempt + 1} error`, error)
    }

    if (attempt < PROFILE_RETRY_ATTEMPTS - 1) {
      await sleep(PROFILE_RETRY_DELAY_MS)
    }
  }

  return { data: null, isNewUser: true }
}

/**
 * Determines whether a user still needs to complete onboarding.
 *
 * Rules (in order):
 *  1. DB flag is authoritative — if onboarding_completed = true, never show onboarding.
 *  2. OAuth users whose trigger already wrote display_name + avatar_url are treated
 *     as complete even if the DB flag is still false (safety net for trigger lag /
 *     existing rows created before the trigger was updated).
 *  3. Everyone else: respect the DB flag.
 */
const deriveOnboardingNeeded = (profile, authUser) => {
  if (!profile) return true
  if (profile.onboarding_completed) return false

  // Safety net: OAuth user already has a real display name and avatar
  const provider = authUser?.app_metadata?.provider ?? ''
  const hasOAuthProfile = OAUTH_PROVIDERS.has(provider) && !!profile.display_name && !!profile.avatar_url
  if (hasOAuthProfile) return false

  return true
}

// ─────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }) => {
  const [user,             setUser]             = useState(null)
  const [profile,          setProfile]          = useState(null)
  const [loading,          setLoading]          = useState(true)
  const [onboardingNeeded, setOnboardingNeeded] = useState(false)

  // Ref holds the userId currently being fetched.
  // Prevents duplicate concurrent loads and detects stale results.
  const activeProfileLoad = useRef(null)

  // ── Core: fetch profile and apply derived state ────────────
  const loadProfile = useCallback(async (authUser) => {
    const userId = authUser?.id
    if (!userId) return

    // De-duplicate: skip if already loading for this exact user
    if (activeProfileLoad.current === userId) return
    activeProfileLoad.current = userId

    try {
      const { data, isNewUser } = await fetchProfileWithRetry(userId)

      // Discard stale result if the active user changed during the await
      if (activeProfileLoad.current !== userId) return

      if (isNewUser || !data) {
        setProfile(null)
        setOnboardingNeeded(true)
      } else {
        setProfile(data)
        setOnboardingNeeded(deriveOnboardingNeeded(data, authUser))
      }
    } finally {
      if (activeProfileLoad.current === userId) {
        activeProfileLoad.current = null
      }
    }
  }, [])

  // ── Bootstrap: resolve existing session on mount ───────────
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
          await loadProfile(session.user)
        }
      } catch (err) {
        console.error('AuthContext: unexpected init error', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    init()

    // ── Realtime auth state listener ─────────────────────────
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
            // Token silently refreshed — session is still valid,
            // user and profile are unchanged, nothing to do.
            break
          }

          case 'SIGNED_IN':
          case 'USER_UPDATED':
          case 'INITIAL_SESSION': {
            if (session?.user) {
              setUser(session.user)
              await loadProfile(session.user)
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

  /**
   * Re-fetches the profile from the DB.
   * Call after any server-side change to the profile row.
   */
  const refreshProfile = useCallback(async () => {
    if (!user) return
    activeProfileLoad.current = null   // force bypass de-dupe guard
    await loadProfile(user)
  }, [user, loadProfile])

  /**
   * Applies an optimistic local update to the profile in state.
   * Call immediately after a successful profiles.update() to keep
   * the UI in sync without waiting for a round-trip.
   *
   * @param {Partial<Profile>} updates
   */
  const updateProfileLocal = useCallback((updates) => {
    setProfile((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...updates }
      // Re-derive onboarding state in case onboarding_completed was just set
      setOnboardingNeeded(deriveOnboardingNeeded(next, user))
      return next
    })
  }, [user])

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
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>')
  return ctx
}
