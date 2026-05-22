// src/pages/ResetPasswordPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import toast from 'react-hot-toast'

// Supabase sends the user to /auth/reset-password with a session embedded
// in the URL hash. supabase-js picks this up automatically on load and
// fires an AUTH_STATE_CHANGE 'PASSWORD_RECOVERY' event. We listen for
// that event to confirm the session is valid before showing the form.

export default function ResetPasswordPage() {
  const navigate = useNavigate()

  const [sessionReady, setSessionReady] = useState(false)
  const [newPass,       setNewPass]      = useState('')
  const [confirmPass,   setConfirmPass]  = useState('')
  const [errors,        setErrors]       = useState({})
  const [loading,       setLoading]      = useState(false)
  const [done,          setDone]         = useState(false)

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event from the hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setSessionReady(true)
    })

    // Also check if the session is already active (page refresh case)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleReset = async () => {
    const errs = {}
    if (!newPass)                errs.newPass     = 'Password is required'
    else if (newPass.length < 8) errs.newPass     = 'At least 8 characters'
    if (newPass !== confirmPass) errs.confirmPass = 'Passwords do not match'
    if (Object.keys(errs).length) return setErrors(errs)

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPass })
    setLoading(false)

    if (error) { toast.error(error.message || 'Failed to reset password'); return }

    setDone(true)
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-10 blur-3xl"
          style={{ background: 'var(--brand)' }}
        />
      </div>

      <div className="relative z-10 flex flex-col flex-1 max-w-sm mx-auto w-full px-6 py-8 justify-center">

        {done ? (
          // ── Success state ──────────────────────────────
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center"
          >
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
              style={{ background: 'rgba(249,115,22,0.1)' }}
            >
              <CheckCircle size={36} style={{ color: 'var(--brand)' }} />
            </div>
            <h2
              className="text-2xl font-black mb-3"
              style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}
            >
              Password updated!
            </h2>
            <p className="mb-8" style={{ color: 'var(--text-muted)' }}>
              Your password has been reset. You can now sign in with your new password.
            </p>
            <Button onClick={() => navigate('/auth')} variant="primary" size="lg" fullWidth>
              Back to sign in
            </Button>
          </motion.div>

        ) : !sessionReady ? (
          // ── Waiting for Supabase to process the hash ───
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center text-center"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 animate-pulse"
              style={{ background: 'rgba(249,115,22,0.1)' }}
            >
              <Lock size={28} style={{ color: 'var(--brand)' }} />
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Verifying your reset link…
            </p>
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              If nothing happens,{' '}
              <button
                onClick={() => navigate('/auth')}
                className="underline font-medium"
                style={{ color: 'var(--brand)' }}
              >
                request a new link
              </button>
            </p>
          </motion.div>

        ) : (
          // ── Reset form ────────────────────────────────
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col"
          >
            <div className="mb-8">
              <h2
                className="text-3xl font-black mb-2"
                style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}
              >
                Set new password
              </h2>
              <p style={{ color: 'var(--text-muted)' }}>
                Choose a strong password for your account
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <Input
                label="New password"
                type="password"
                value={newPass}
                onChange={(e) => { setNewPass(e.target.value); setErrors({}) }}
                placeholder="At least 8 characters"
                icon={Lock}
                error={errors.newPass}
                autoFocus
                autoComplete="new-password"
              />
              <Input
                label="Confirm new password"
                type="password"
                value={confirmPass}
                onChange={(e) => { setConfirmPass(e.target.value); setErrors({}) }}
                placeholder="Repeat your password"
                icon={Lock}
                error={errors.confirmPass}
                autoComplete="new-password"
              />
              <Button onClick={handleReset} loading={loading} variant="primary" size="lg" fullWidth>
                Reset password
              </Button>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  )
}
