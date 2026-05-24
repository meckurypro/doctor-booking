// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect }    from 'react'
import { Toaster }      from 'react-hot-toast'

import { supabase }             from '@/lib/supabase'
import { AuthProvider, useAuth} from '@/context/AuthContext'
import { ThemeProvider }        from '@/context/ThemeContext'

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

// ── OAuth / Email Callback Handler ─────────────────────────
//
// Supabase redirects here after:
//   • Google OAuth  → URL contains ?code=...
//   • Email OTP     → URL contains #access_token=... (handled
//                     automatically by detectSessionInUrl, but
//                     we still need to route the user away)
//
// Strategy: exchange the code, then send the user to /auth.
// AuthContext will have loaded the session by then and AuthPage
// will automatically redirect to /feed (or show SET_PROFILE for
// new Google users who need to complete onboarding).

const AuthCallbackPage = () => {
  const navigate = useNavigate()

  useEffect(() => {
    const handle = async () => {
      const url = window.location.href

      // Only call exchangeCodeForSession when a code is present.
      // Hash-based sessions (email OTP) are handled by detectSessionInUrl.
      const hasCode = new URLSearchParams(window.location.search).has('code')

      if (hasCode) {
        const { error } = await supabase.auth.exchangeCodeForSession(url)
        if (error) {
          console.error('AuthCallback: exchangeCodeForSession failed', error)
          navigate('/auth?error=oauth_failed', { replace: true })
          return
        }
      }

      // Let AuthContext pick up the new session via onAuthStateChange,
      // then AuthPage decides where to send the user.
      navigate('/auth', { replace: true })
    }

    handle()
  }, [navigate])

  return <FullLoader size="lg" />
}

// ── Protected Route ────────────────────────────────────────

const ProtectedRoute = ({ children }) => {
  const { user, loading, onboardingNeeded } = useAuth()

  if (loading) return <FullLoader />

  // Not authenticated → login
  if (!user) return <Navigate to="/auth" replace />

  // Authenticated but profile not set up → complete onboarding
  if (onboardingNeeded) return <Navigate to="/auth" replace />

  return children
}

// ── Admin Route ────────────────────────────────────────────

const AdminRoute = ({ children }) => {
  const { user, isAdmin, loading } = useAuth()

  if (loading)  return <FullLoader />
  if (!user)    return <Navigate to="/auth"  replace />
  if (!isAdmin) return <Navigate to="/feed"  replace />

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

  if (loading) return <FullLoader size="lg" />

  return (
    <Routes>

      {/* ── Public ─────────────────────────────────────── */}
      <Route
        path="/"
        element={user ? <Navigate to="/feed" replace /> : <LandingPage />}
      />
      <Route
        path="/auth"
        element={user ? <Navigate to="/feed" replace /> : <AuthPage />}
      />

      {/* Supabase auth redirects land here */}
      <Route path="/auth/callback"       element={<AuthCallbackPage />} />
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

      {/* ── Protected ──────────────────────────────────── */}
      <Route path="/feed" element={
        <ProtectedRoute>
          <AppLayout><FeedPage /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/create" element={
        <ProtectedRoute>
          <AppLayout><CreatePage /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/generate" element={
        <ProtectedRoute>
          <AppLayout><GeneratePage /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/result/:id" element={
        <ProtectedRoute>
          <AppLayout><ResultPage /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/history" element={
        <ProtectedRoute>
          <AppLayout><HistoryPage /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute>
          <AppLayout><ProfilePage /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <AppLayout><SettingsPage /></AppLayout>
        </ProtectedRoute>
      } />

      {/* ── Admin (no BottomNav) ────────────────────────── */}
      <Route path="/admin" element={
        <AdminRoute><AdminPage /></AdminRoute>
      } />

      {/* ── Fallback ────────────────────────────────────── */}
      <Route
        path="*"
        element={<Navigate to={user ? '/feed' : '/'} replace />}
      />

    </Routes>
  )
}

// ── Toast styles ───────────────────────────────────────────

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
          {/* Toaster inside BrowserRouter so toasts work everywhere */}
          <Toaster position="top-center" toastOptions={toastOptions} />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
