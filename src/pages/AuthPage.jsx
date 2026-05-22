import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, User, ArrowRight } from 'lucide-react'
import { auth, profiles } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input, OTPInput } from '@/components/ui/Input'
import { Divider } from '@/components/ui/Modal'
import toast from 'react-hot-toast'

// ============================================================
// VIEWS
// ============================================================

const VIEWS = {
  LANDING:         'landing',
  EMAIL_ENTRY:     'email_entry',
  OTP_VERIFY:      'otp_verify',
  SET_PASSWORD:    'set_password',
  SET_PROFILE:     'set_profile',
  LOGIN:           'login',
  FORGOT_PASSWORD: 'forgot_password',
  RESET_SENT:      'reset_sent',
}

// ============================================================
// AUTH PAGE
// ============================================================

export default function AuthPage() {
  const navigate = useNavigate()
  const [view, setView]               = useState(VIEWS.LANDING)
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [otp, setOtp]                 = useState('')
  const [username, setUsername]       = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading]         = useState(false)
  const [errors, setErrors]           = useState({})

  const clearErrors = () => setErrors({})

  const back = () => {
    clearErrors()
    const backMap = {
      [VIEWS.EMAIL_ENTRY]:     VIEWS.LANDING,
      [VIEWS.OTP_VERIFY]:      VIEWS.EMAIL_ENTRY,
      [VIEWS.SET_PASSWORD]:    VIEWS.OTP_VERIFY,
      [VIEWS.SET_PROFILE]:     VIEWS.SET_PASSWORD,
      [VIEWS.FORGOT_PASSWORD]: VIEWS.LOGIN,
      [VIEWS.RESET_SENT]:      VIEWS.LOGIN,
    }
    setView(backMap[view] || VIEWS.LANDING)
  }

  // ── SIGNUP: Send OTP ──────────────────────────────────────
  const handleSendOTP = async () => {
    clearErrors()
    if (!email) return setErrors({ email: 'Email is required' })
    if (!/\S+@\S+\.\S+/.test(email)) return setErrors({ email: 'Enter a valid email address' })

    setLoading(true)
    const { error } = await auth.signUpWithEmail(email)
    setLoading(false)

    if (error) { toast.error(error.message || 'Failed to send code'); return }

    toast.success('Check your email for the 6-digit code!')
    setView(VIEWS.OTP_VERIFY)
  }

  // ── SIGNUP: Verify OTP ────────────────────────────────────
  const handleVerifyOTP = async () => {
    clearErrors()
    if (otp.length < 6) return setErrors({ otp: 'Enter the complete 6-digit code' })

    setLoading(true)
    const { error } = await auth.verifyOTP(email, otp)
    setLoading(false)

    if (error) { setErrors({ otp: 'Invalid or expired code. Try again.' }); return }

    // OTP verified — now set a password
    setView(VIEWS.SET_PASSWORD)
  }

  // ── SIGNUP: Set Password ──────────────────────────────────
  const handleSetPassword = async () => {
    clearErrors()
    const newErrors = {}
    if (!newPassword) newErrors.newPassword = 'Password is required'
    else if (newPassword.length < 8) newErrors.newPassword = 'At least 8 characters'
    if (newPassword !== confirmPass) newErrors.confirmPass = 'Passwords do not match'
    if (Object.keys(newErrors).length > 0) return setErrors(newErrors)

    setLoading(true)
    const { error } = await auth.updatePassword(newPassword)
    setLoading(false)

    if (error) { toast.error('Failed to set password'); return }

    setView(VIEWS.SET_PROFILE)
  }

  // ── SIGNUP: Set Profile ───────────────────────────────────
  const handleSetProfile = async () => {
    clearErrors()
    const newErrors = {}
    if (!username) newErrors.username = 'Username is required'
    else if (username.length < 3) newErrors.username = 'At least 3 characters'
    else if (!/^[a-zA-Z0-9_]+$/.test(username)) newErrors.username = 'Letters, numbers and underscores only'
    if (Object.keys(newErrors).length > 0) return setErrors(newErrors)

    setLoading(true)

    const { available } = await profiles.checkUsername(username.toLowerCase())
    if (!available) {
      setLoading(false)
      return setErrors({ username: 'Username is taken. Try another.' })
    }

    const { user } = await auth.getUser()
    const { error } = await profiles.completeOnboarding(user.id, {
      username: username.toLowerCase(),
      displayName: displayName || username,
    })

    setLoading(false)
    if (error) { toast.error('Failed to save profile'); return }

    toast.success('Welcome to Meckury! 🎉')
    navigate('/create')
  }

  // ── LOGIN ─────────────────────────────────────────────────
  const handleLogin = async () => {
    clearErrors()
    const newErrors = {}
    if (!email) newErrors.email = 'Email is required'
    if (!password) newErrors.password = 'Password is required'
    if (Object.keys(newErrors).length > 0) return setErrors(newErrors)

    setLoading(true)
    const { error } = await auth.signIn(email, password)
    setLoading(false)

    if (error) { setErrors({ password: 'Invalid email or password' }); return }
    navigate('/create')
  }

  // ── GOOGLE AUTH ───────────────────────────────────────────
  const handleGoogleAuth = async () => {
    const { error } = await auth.signInWithGoogle()
    if (error) toast.error('Google sign in failed')
  }

  // ── FORGOT PASSWORD ───────────────────────────────────────
  const handleForgotPassword = async () => {
    clearErrors()
    if (!email) return setErrors({ email: 'Enter your email address' })

    setLoading(true)
    const { error } = await auth.resetPassword(email)
    setLoading(false)

    if (error) { toast.error('Failed to send reset email'); return }
    setView(VIEWS.RESET_SENT)
  }

  // ── SHARED COMPONENTS ─────────────────────────────────────

  const BackButton = () => view !== VIEWS.LANDING ? (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={back}
      className="flex items-center gap-1.5 mb-8 -ml-1 p-2 rounded-xl w-fit text-sm font-medium"
      style={{ color: 'var(--text-secondary)' }}
    >
      ← Back
    </motion.button>
  ) : null

  const GoogleButton = () => (
    <Button onClick={handleGoogleAuth} variant="secondary" size="lg" fullWidth>
      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
      Continue with Google
    </Button>
  )

  // ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--bg-primary)' }}>

      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-10 blur-3xl"
          style={{ background: 'var(--brand)' }} />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-5 blur-3xl"
          style={{ background: 'var(--brand)' }} />
      </div>

      <div className="relative z-10 flex flex-col flex-1 max-w-sm mx-auto w-full px-6 py-8">

        <AnimatePresence mode="wait">

          {/* ── LANDING ──────────────────────────────────── */}
          {view === VIEWS.LANDING && (
            <motion.div key="landing"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="flex flex-col flex-1">
              <div className="flex flex-col items-center mt-16 mb-12">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4 shadow-brand"
                  style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
                  <img src="/icons/icon-96.png" alt="Meckury" className="w-14 h-14 object-contain" />
                </div>
                <h1 className="text-4xl font-black" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
                  Meckury
                </h1>
                <p className="text-base mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
                  Create stunning AI content
                </p>
                <p className="text-xs mt-2 px-3 py-1.5 rounded-full font-semibold"
                  style={{ background: 'rgba(249,115,22,0.1)', color: 'var(--brand)' }}>
                  ⚡ 5 free credits on signup
                </p>
              </div>
              <div className="flex flex-col gap-3 mt-auto">
                <Button onClick={() => setView(VIEWS.EMAIL_ENTRY)} variant="primary" size="lg" fullWidth>
                  Get started free
                </Button>
                <Button onClick={() => setView(VIEWS.LOGIN)} variant="secondary" size="lg" fullWidth>
                  Sign in
                </Button>
                <Divider text="or" />
                <GoogleButton />
                <p className="text-xs text-center mt-4" style={{ color: 'var(--text-muted)' }}>
                  By continuing you agree to our Terms & Privacy Policy
                </p>
              </div>
            </motion.div>
          )}

          {/* ── EMAIL ENTRY ───────────────────────────────── */}
          {view === VIEWS.EMAIL_ENTRY && (
            <motion.div key="email"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="flex flex-col flex-1">
              <BackButton />
              <div className="mb-8">
                <h2 className="text-3xl font-black mb-2" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
                  Create account
                </h2>
                <p style={{ color: 'var(--text-muted)' }}>We'll send a 6-digit verification code to your email</p>
              </div>
              <div className="flex flex-col gap-4">
                <Input label="Email address" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" icon={Mail} error={errors.email}
                  autoComplete="email" autoFocus />
                <Button onClick={handleSendOTP} loading={loading} variant="primary" size="lg" fullWidth icon={ArrowRight}>
                  Send verification code
                </Button>
                <Divider text="or" />
                <GoogleButton />
              </div>
              <p className="text-sm text-center mt-8" style={{ color: 'var(--text-muted)' }}>
                Already have an account?{' '}
                <button onClick={() => setView(VIEWS.LOGIN)} className="font-semibold" style={{ color: 'var(--brand)' }}>
                  Sign in
                </button>
              </p>
            </motion.div>
          )}

          {/* ── OTP VERIFY ────────────────────────────────── */}
          {view === VIEWS.OTP_VERIFY && (
            <motion.div key="otp"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="flex flex-col flex-1">
              <BackButton />
              <div className="mb-8">
                <h2 className="text-3xl font-black mb-2" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
                  Check your email
                </h2>
                <p style={{ color: 'var(--text-muted)' }}>
                  We sent a code to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>
                </p>
              </div>
              <div className="flex flex-col gap-6">
                <OTPInput value={otp} onChange={setOtp} length={6} />
                {errors.otp && <p className="text-sm text-red-500 text-center -mt-2">{errors.otp}</p>}
                <Button onClick={handleVerifyOTP} loading={loading} variant="primary" size="lg" fullWidth>
                  Verify code
                </Button>
                <button onClick={handleSendOTP} className="text-sm text-center font-medium" style={{ color: 'var(--brand)' }}>
                  Resend code
                </button>
              </div>
            </motion.div>
          )}

          {/* ── SET PASSWORD ──────────────────────────────── */}
          {view === VIEWS.SET_PASSWORD && (
            <motion.div key="set-password"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="flex flex-col flex-1">
              <BackButton />
              <div className="mb-8">
                <h2 className="text-3xl font-black mb-2" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
                  Set a password
                </h2>
                <p style={{ color: 'var(--text-muted)' }}>Choose a strong password to secure your account</p>
              </div>
              <div className="flex flex-col gap-4">
                <Input label="Password" type="password" value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters" icon={Lock}
                  error={errors.newPassword} autoFocus autoComplete="new-password" />
                <Input label="Confirm password" type="password" value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="Repeat your password" icon={Lock}
                  error={errors.confirmPass} autoComplete="new-password" />
                <Button onClick={handleSetPassword} loading={loading} variant="primary" size="lg" fullWidth>
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── SET PROFILE ───────────────────────────────── */}
          {view === VIEWS.SET_PROFILE && (
            <motion.div key="profile"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="flex flex-col flex-1">
              <BackButton />
              <div className="mb-8">
                <h2 className="text-3xl font-black mb-2" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
                  Set up profile
                </h2>
                <p style={{ color: 'var(--text-muted)' }}>Almost there! Choose your username</p>
              </div>
              <div className="flex flex-col gap-4">
                <Input label="Username" value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="yourname" icon={User} error={errors.username}
                  hint="Letters, numbers and underscores only" maxLength={30} autoFocus />
                <Input label="Display name (optional)" value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your Name" icon={User} maxLength={50} />
                <Button onClick={handleSetProfile} loading={loading} variant="primary" size="lg" fullWidth>
                  Start creating 🎉
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── LOGIN ─────────────────────────────────────── */}
          {view === VIEWS.LOGIN && (
            <motion.div key="login"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="flex flex-col flex-1">
              <BackButton />
              <div className="mb-8">
                <h2 className="text-3xl font-black mb-2" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
                  Welcome back
                </h2>
                <p style={{ color: 'var(--text-muted)' }}>Sign in to your account</p>
              </div>
              <div className="flex flex-col gap-4">
                <Input label="Email address" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" icon={Mail} error={errors.email}
                  autoComplete="email" autoFocus />
                <Input label="Password" type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" icon={Lock} error={errors.password}
                  autoComplete="current-password" />
                <button onClick={() => setView(VIEWS.FORGOT_PASSWORD)}
                  className="text-sm text-right font-medium -mt-2" style={{ color: 'var(--brand)' }}>
                  Forgot password?
                </button>
                <Button onClick={handleLogin} loading={loading} variant="primary" size="lg" fullWidth>
                  Sign in
                </Button>
                <Divider text="or" />
                <GoogleButton />
              </div>
              <p className="text-sm text-center mt-8" style={{ color: 'var(--text-muted)' }}>
                Don't have an account?{' '}
                <button onClick={() => setView(VIEWS.EMAIL_ENTRY)} className="font-semibold" style={{ color: 'var(--brand)' }}>
                  Sign up free
                </button>
              </p>
            </motion.div>
          )}

          {/* ── FORGOT PASSWORD ───────────────────────────── */}
          {view === VIEWS.FORGOT_PASSWORD && (
            <motion.div key="forgot"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="flex flex-col flex-1">
              <BackButton />
              <div className="mb-8">
                <h2 className="text-3xl font-black mb-2" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
                  Reset password
                </h2>
                <p style={{ color: 'var(--text-muted)' }}>Enter your email and we'll send a reset link</p>
              </div>
              <div className="flex flex-col gap-4">
                <Input label="Email address" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" icon={Mail} error={errors.email} autoFocus />
                <Button onClick={handleForgotPassword} loading={loading} variant="primary" size="lg" fullWidth>
                  Send reset link
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── RESET SENT ────────────────────────────────── */}
          {view === VIEWS.RESET_SENT && (
            <motion.div key="reset-sent"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col flex-1 items-center justify-center text-center">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
                style={{ background: 'rgba(249,115,22,0.1)' }}>
                <Mail size={36} style={{ color: 'var(--brand)' }} />
              </div>
              <h2 className="text-2xl font-black mb-3" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
                Check your email
              </h2>
              <p className="mb-8" style={{ color: 'var(--text-muted)' }}>
                We sent a reset link to{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>
              </p>
              <Button onClick={() => setView(VIEWS.LOGIN)} variant="secondary" size="md">
                Back to sign in
              </Button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
