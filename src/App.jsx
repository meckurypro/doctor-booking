import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'

// Pages
import LandingPage      from '@/pages/LandingPage'
import AuthPage         from '@/pages/AuthPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import FeedPage         from '@/pages/FeedPage'
import CreatePage       from '@/pages/CreatePage'
import GeneratePage     from '@/pages/GeneratePage'
import ResultPage       from '@/pages/ResultPage'
import HistoryPage      from '@/pages/HistoryPage'
import ProfilePage      from '@/pages/ProfilePage'
import SettingsPage     from '@/pages/SettingsPage'
import AdminPage        from '@/pages/AdminPage'

// Layout
import { BottomNav } from '@/components/layout/BottomNav'
import { Loader }    from '@/components/ui/Modal'

// ── Protected Route ────────────────────────────────────────

const ProtectedRoute = ({ children }) => {
  const { user, loading, onboardingNeeded } = useAuth()

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center"
        style={{ background: 'var(--bg-primary)' }}>
        <Loader size="md" />
      </div>
    )
  }

  if (!user)             return <Navigate to="/auth"   replace />
  if (onboardingNeeded)  return <Navigate to="/auth"   replace />

  return children
}

// ── Admin Route ────────────────────────────────────────────

const AdminRoute = ({ children }) => {
  const { isAdmin, loading } = useAuth()
  if (loading)   return null
  if (!isAdmin)  return <Navigate to="/feed" replace />
  return children
}

// ── App Layout (with bottom nav) ───────────────────────────

const AppLayout = ({ children }) => (
  <div className="page-container" style={{ background: 'var(--bg-primary)' }}>
    {children}
    <BottomNav />
  </div>
)

// ── Routes ─────────────────────────────────────────────────

const AppRoutes = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center"
        style={{ background: 'var(--bg-primary)' }}>
        <Loader size="lg" />
      </div>
    )
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/"                    element={user ? <Navigate to="/create" replace /> : <LandingPage />} />
      <Route path="/auth"                element={user ? <Navigate to="/create" replace /> : <AuthPage />} />
      <Route path="/auth/callback"       element={<Navigate to="/create" replace />} />
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

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

      {/* Admin */}
      <Route path="/admin" element={
        <AdminRoute><AdminPage /></AdminRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to={user ? '/create' : '/'} replace />} />
    </Routes>
  )
}

// ── Main App ───────────────────────────────────────────────

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background:  'var(--bg-elevated)',
                color:       'var(--text-primary)',
                border:      '1px solid var(--border)',
                borderRadius: '14px',
                fontFamily:  'DM Sans, sans-serif',
                fontSize:    '14px',
                fontWeight:  500,
                padding:     '12px 16px',
                maxWidth:    '360px',
              },
              success: { iconTheme: { primary: '#f97316', secondary: 'white' } },
              error:   { iconTheme: { primary: '#ef4444', secondary: 'white' } },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
