// src/pages/AuthCallbackPage.jsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.exchangeCodeForSession(window.location.href).then(({ error }) => {
      if (error) {
        console.error('OAuth callback error:', error)
        navigate('/auth?error=oauth')
      } else {
        navigate('/feed')
      }
    })
  }, [])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', background: 'var(--bg-primary)' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Signing you in...</p>
    </div>
  )
}
