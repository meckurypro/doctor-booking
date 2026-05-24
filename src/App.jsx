// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect }  from 'react'
import { Toaster }    from 'react-hot-toast'

import { supabase }              from '@/lib/supabase'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { ThemeProvider }         from '@/context/ThemeContext'

// Pages
import LandingPage       from '@/pages/LandingPage'
import AuthPage          from '@/pages/AuthPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import FeedPage          from '@/pages/FeedPage'
import CreatePage        from '@/pages/CreatePage'
import GeneratePage      from '@/pages/GeneratePage'
import ResultPage        from '@/pages/ResultPage'
import HistoryPage       from '@/pages/HistoryPage'
import ProfilePage       from '@/pages/ProfilePage'
import SettingsPage      from '@/pages/SettingsPage'
import AdminPage         from '@/pages/AdminPage'

// Layout / UI
import { BottomNav } from '@/components/layout/BottomNav'
import { Loader }    from '@/components/ui/Modal'

// ── Full-screen loader ─────────────────────────────────────

const FullLoader = ({ size = 'md' }) => (
  <div
    className="min-h-dvh flex items-center justify-center"
    style={{ background: 'var(--bg-primary)' }}
  >
    <Loader size={size} />
  </div>
)

// ── OAuth Callback Handler ─────────────────────────────────
// Handles BOTH flow types:
//   PKCE flow    → token arrives as ?code=   in search params
//   Implicit flow → token arrives as #access_token= in hash
//
// Supabase's detectSessionInUrl:true handles the implicit flow
// automatically — we just need to wait for onAuthStateChange
// to fire SIGNED_IN, then navigate.

const AuthCallbackPage = () => {
  const navigate = useNavigate()

  useEffect(() => {
    const search   = window.location.search
    const hash     = window.location.hash
    const hasCode  = new URLSearchParams(search).has('code')
    const hasToken = hash.includes('access_token=')

    console.log('[AuthCallback] search  :', search)
    console.log('[AuthCallback] hash    :', hash ? '[present]' : '[empty]')
    console.log('[AuthCallback] hasCode :', hasCode)
    console.log('[AuthCallback] hasToken:', hasToken)

    if (hasCode) {
      // PKCE flow — exchange the code for a session manually
      supabase.auth.exchangeCodeForSession(window.location.href).then(({ error }) => {
        if (error) {
          console.error('[AuthCallback] exchangeCodeForSession error:', error)
          navigate('/auth?error=oauth_failed', { replace: true })
          return
        }
        console.log('[AuthCallback] PKCE exchange success — navigating to /auth')
        navigate('/auth', { replace: true })
      })
      return
    }

    if (hasToken) {
      // Implicit flow — supabase-js detects the hash automatically via
      // detectSessionInUrl:true and fires onAuthStateChange(SIGNED_IN).
      // We just need to wait for it, then navigate.
      console.log('[AuthCallback] Implicit flow — waiting for SIGNED_IN event')

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('[AuthCallback] onAuthStateChange event:', event)
        if (event === 'SIGNED_IN' && session) {
          subscription.unsubscribe()
          navigate('/auth', { replace: true })
        }
      })

      // Fallback: if onAuthStateChange already fired before we subscribed,
      // check the session directly
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          console.log('[AuthCallback] Session already present — navigating to /auth')
          subscription.unsubscribe()
          navigate('/auth', { replace: true })
        }
      })

      return
    }

    // No token or code — stale / direct hit
    console.warn('[AuthCallback] No token or code found — redirecting to /auth')
    navigate('/auth', { replace: true })
  }, [navigate])

  return <FullLoader size="lg" />
}

// ── Protected Route ────────────────────────────────────────

const ProtectedRoute = ({ children }) => {
  const { user, loading, onboardingNeeded } = useAuth()

  if (loading)          return <FullLoader />
  if (!user)            return <Navigate to="/auth" replace />
  if (onboardingNeeded) return <Navigate to="/auth" replace />

  return children
}

// ── Admin Route ────────────────────────────────────────────

const AdminRoute = ({ children }) => {
  const { user, isAdmin, loading } = useAuth()

  if (loading)  return <FullLoader />
  if (!user)    return <Navigate to="/auth" replace />
  if (!isAdmin) return <Navigate to="/feed" replace />

  return children
}

// ── App Layout (with bottom nav) ───────────────────────────

const AppLayout = ({ children }) => (
  <div className="page-container" style={{ background: 'var(--bg-primary)' }}>
    {children}
    <BottomNav />
  </div>
)

// ── Route Definitions ──────────────────────────────────────

const AppRoutes = () => {
  const { user, loading } = useAuth()

  return (
    <Routes>

      {/* ── Auth redirects — NEVER blocked by loading ──── */}
      <Route path="/auth/callback"       element={<AuthCallbackPage />} />
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

      {/* ── Everything else waits for auth to resolve ──── */}
      {loading ? (
        <Route path="*" element={<FullLoader size="lg" />} />
      ) : (
        <>
          {/* Public */}
          <Route
            path="/"
            element={user ? <Navigate to="/feed" replace /> : <LandingPage />}
          />
          <Route
            path="/auth"
            element={user ? <Navigate to="/feed" replace /> : <AuthPage />}
          />

          {/* Protected */}
          <Route path="/feed" element={
            <ProtectedRoute><AppLayout><FeedPage /></AppLayout></ProtectedRoute>
          } />
          <Route path="/create" element={
            <ProtectedRoute><AppLayout><CreatePage /></AppLayout></ProtectedRoute>
          } />
          <Route path="/generate" element={
            <ProtectedRoute><AppLayout><GeneratePage /></AppLayout></ProtectedRoute>
          } />
          <Route path="/result/:id" element={
            <ProtectedRoute><AppLayout><ResultPage /></AppLayout></ProtectedRoute>
          } />
          <Route path="/history" element={
            <ProtectedRoute><AppLayout><HistoryPage /></AppLayout></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><AppLayout><ProfilePage /></AppLayout></ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>
          } />

          {/* Admin — no AppLayout / no BottomNav */}
          <Route path="/admin" element={
            <AdminRoute><AdminPage /></AdminRoute>
          } />

          {/* Fallback */}
          <Route
            path="*"
            element={<Navigate to={user ? '/feed' : '/'} replace />}
          />
        </>
      )}

    </Routes>
  )
}

// ── Toast config ───────────────────────────────────────────

const toastOptions = {
  duration: 3000,
  style: {
    background:   'var(--bg-elevated)',
    color:        'var(--text-primary)',
    border:       '1px solid var(--border)',
    borderRadius: '14px',
    fontFamily:   'Inter, sans-serif',
    fontSize:     '14px',
    fontWeight:   500,
    padding:      '12px 16px',
    maxWidth:     '360px',
  },
  success: { iconTheme: { primary: '#f97316', secondary: 'white' } },
  error:   { iconTheme: { primary: '#ef4444', secondary: 'white' } },
}

// ── Main App ───────────────────────────────────────────────

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-center" toastOptions={toastOptions} />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
