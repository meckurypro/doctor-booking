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
// Must NOT be inside the loading gate — it needs to run
// immediately when Supabase redirects back with ?code=...
// If it's blocked by `if (loading) return <FullLoader />`,
// the code expires before exchangeCodeForSession is called
// and no user is ever created.

const AuthCallbackPage = () => {
  const navigate = useNavigate()

  useEffect(() => {
    const handle = async () => {
      const hasCode = new URLSearchParams(window.location.search).has('code')

      if (hasCode) {
        const { error } = await supabase.auth.exchangeCodeForSession(
          window.location.href,
        )
        if (error) {
          console.error('AuthCallback: exchangeCodeForSession failed', error)
          navigate('/auth?error=oauth_failed', { replace: true })
          return
        }
      }

      // Session is now established. Navigate to /auth — AuthContext will
      // pick up the session via onAuthStateChange and AuthPage will either
      // redirect to /feed (existing user) or show SET_PROFILE (new user).
      navigate('/auth', { replace: true })
    }

    handle()
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
// IMPORTANT: /auth/callback and /auth/reset-password are declared
// BEFORE the loading gate so they always mount and run their
// useEffect regardless of auth loading state.

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
