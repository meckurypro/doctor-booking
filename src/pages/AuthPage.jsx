// src/pages/AuthPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, User, ArrowRight, Zap } from 'lucide-react'
import { auth, profiles } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Divider } from '@/components/ui/Modal'
import toast from 'react-hot-toast'

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

const BACK_MAP = {
  [VIEWS.EMAIL_ENTRY]:     VIEWS.LANDING,
  [VIEWS.OTP_VERIFY]:      VIEWS.EMAIL_ENTRY,
  [VIEWS.SET_PASSWORD]:    VIEWS.OTP_VERIFY,
  [VIEWS.SET_PROFILE]:     VIEWS.LANDING,
  [VIEWS.LOGIN]:           VIEWS.LANDING,
  [VIEWS.FORGOT_PASSWORD]: VIEWS.LOGIN,
  [VIEWS.RESET_SENT]:      VIEWS.LOGIN,
}

const REEL_ITEMS = [
  { id: 1, colors: ['#1a0a00', '#f97316', '#7c2d12'], label: 'Office Handover' },
  { id: 2, colors: ['#000000', '#1c1c1c', '#2d2d2d'], label: 'Memory Lane' },
  { id: 3, colors: ['#0a0a1a', '#1e3a5f', '#0ea5e9'], label: 'AI Portrait' },
  { id: 4, colors: ['#0a1a0a', '#14532d', '#16a34a'], label: 'Brand Video' },
  { id: 5, colors: ['#1a0a1a', '#6b21a8', '#a855f7'], label: 'Cinematic' },
  { id: 6, colors: ['#1a1000', '#92400e', '#d97706'], label: 'History' },
]

const slideIn = { initial: { opacity: 0, x: 30 },      animate: { opacity: 1, x: 0 },    exit: { opacity: 0, x: -30 } }
const fadeIn  = { initial: { opacity: 0, y: 20 },       animate: { opacity: 1, y: 0 },    exit: { opacity: 0, y: -20 } }
const scaleIn = { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 } }

export default function AuthPage() {
  const navigate                   = useNavigate()
  const { user, onboardingNeeded } = useAuth()

  const [view,        setView]        = useState(VIEWS.LANDING)
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [otp,         setOtp]         = useState('')
  const [username,    setUsername]    = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading,     setLoading]     = useState(false)
  const [errors,      setErrors]      = useState({})

  useEffect(() => {
    if (user && onboardingNeeded) setView(VIEWS.SET_PROFILE)
  }, [user, onboardingNeeded])

  const clearErrors = () => setErrors({})
  const back = () => { clearErrors(); setView(BACK_MAP[view] ?? VIEWS.LANDING) }

  const handleSendOTP = async () => {
    clearErrors()
    if (!email)                      return setErrors({ email: 'Email is required' })
    if (!/\S+@\S+\.\S+/.test(email)) return setErrors({ email: 'Enter a valid email address' })
    setLoading(true)
    const { error } = await auth.signUpWithEmail(email)
    setLoading(false)
    if (error) { toast.error(error.message || 'Failed to send code'); return }
    toast.success('Check your email for the 8-digit code!')
    setView(VIEWS.OTP_VERIFY)
  }

  const handleVerifyOTP = async () => {
    clearErrors()
    if (otp.length < 8) return setErrors({ otp: 'Enter the complete 8-digit code' })
    setLoading(true)
    const { error } = await auth.verifyOTP(email, otp)
    setLoading(false)
    if (error) { setErrors({ otp: 'Invalid or expired code. Try again.' }); return }
    setView(VIEWS.SET_PASSWORD)
  }

  const handleSetPassword = async () => {
    clearErrors()
    const errs = {}
    if (!newPassword)                errs.newPassword = 'Password is required'
    else if (newPassword.length < 8) errs.newPassword = 'At least 8 characters'
    if (newPassword !== confirmPass) errs.confirmPass = 'Passwords do not match'
    if (Object.keys(errs).length)    return setErrors(errs)
    setLoading(true)
    const { error } = await auth.updatePassword(newPassword)
    setLoading(false)
    if (error) { toast.error('Failed to set password'); return }
    setView(VIEWS.SET_PROFILE)
  }

  const handleSetProfile = async () => {
    clearErrors()
    const errs = {}
    if (!username)                               errs.username = 'Username is required'
    else if (username.length < 3)                errs.username = 'At least 3 characters'
    else if (!/^[a-zA-Z0-9_]+$/.test(username)) errs.username = 'Letters, numbers and underscores only'
    if (Object.keys(errs).length)                return setErrors(errs)
    setLoading(true)
    const { available } = await profiles.checkUsername(username.toLowerCase())
    if (!available) { setLoading(false); return setErrors({ username: 'Username is taken. Try another.' }) }
    const { error } = await profiles.completeOnboarding(user.id, {
      username:    username.toLowerCase(),
      displayName: displayName || username,
    })
    setLoading(false)
    if (error) { toast.error('Failed to save profile'); return }
    toast.success('Welcome to Meckury AI! 🎉')
    navigate('/create')
  }

  const handleLogin = async () => {
    clearErrors()
    const errs = {}
    if (!email)    errs.email    = 'Email is required'
    if (!password) errs.password = 'Password is required'
    if (Object.keys(errs).length) return setErrors(errs)
    setLoading(true)
    const { error } = await auth.signIn(email, password)
    setLoading(false)
    if (error) { setErrors({ password: 'Invalid email or password' }); return }
    navigate('/create')
  }

  const handleGoogleAuth = async () => {
    const { error } = await auth.signInWithGoogle()
    if (error) toast.error('Google sign in failed')
  }

  const handleForgotPassword = async () => {
    clearErrors()
    if (!email) return setErrors({ email: 'Enter your email address' })
    setLoading(true)
    const { error } = await auth.resetPassword(email)
    setLoading(false)
    if (error) { toast.error('Failed to send reset email'); return }
    setView(VIEWS.RESET_SENT)
  }

  const BackButton = () =>
    view !== VIEWS.LANDING ? (
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
    <button
      onClick={handleGoogleAuth}
      className="w-full py-4 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
      style={{
        background: 'var(--bg-elevated)',
        color:      'var(--text-secondary)',
        border:     '1px solid var(--border)',
      }}
    >
      <img
        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
        alt="Google"
        className="w-4 h-4"
      />
      Continue with Google
    </button>
  )

  const PrimaryButton = ({ onClick, children, disabled }) => (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full py-4 rounded-2xl text-sm font-bold tracking-tight transition-all active:scale-[0.98]"
      style={{
        background: 'var(--text-primary)',
        color:      'var(--text-inverse)',
        opacity:    (disabled || loading) ? 0.6 : 1,
      }}
    >
      {loading ? 'Please wait…' : children}
    </button>
  )

  const SecondaryButton = ({ onClick, children }) => (
    <button
      onClick={onClick}
      className="w-full py-4 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]"
      style={{
        background: 'var(--bg-elevated)',
        color:      'var(--text-secondary)',
        border:     '1px solid var(--border)',
      }}
    >
      {children}
    </button>
  )

  const OrDivider = () => (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>or</span>
      <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
    </div>
  )

  // ── Left panel (desktop only) ─────────────────────────
  const LeftPanel = () => (
    <div
      className="hidden lg:flex flex-col justify-between p-12 flex-1"
      style={{ borderRight: '1px solid var(--border)' }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => navigate('/')}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
        >
          <Zap size={14} fill="white" className="text-white" />
        </div>
        <span className="font-bold text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Meckury AI
        </span>
      </div>

      {/* Headline */}
      <div>
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-5"
          style={{ color: 'var(--brand)' }}
        >
          AI Content Studio
        </p>
        <h2
          className="font-black leading-none tracking-tight mb-6"
          style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', letterSpacing: '-0.04em', color: 'var(--text-primary)' }}
        >
          Create.
          <br />
          <span style={{ color: 'var(--text-muted)' }}>Go viral.</span>
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)', maxWidth: '300px' }}>
          Cinematic AI videos and images in seconds. No skills required.
        </p>
      </div>

      {/* Reel grid */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          Made with Meckury AI
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
          }}
        >
          {REEL_ITEMS.map((item) => (
            <div
              key={item.id}
              className="relative rounded-xl overflow-hidden"
              style={{
                height: '100px',
                background: `linear-gradient(160deg, ${item.colors[0]}, ${item.colors[1]}, ${item.colors[2]})`,
              }}
            >
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.7) 100%)' }}
              />
              <div className="absolute bottom-0 left-0 right-0 p-2">
                <p className="text-white text-xs font-semibold leading-tight" style={{ opacity: 0.85 }}>
                  {item.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      {/* ── Mobile header (hidden on desktop — left panel has logo) ── */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center px-6 h-14"
        style={{
          background:           'var(--bg-primary)',
          borderBottom:         '1px solid var(--border)',
          backdropFilter:       'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
          >
            <Zap size={14} fill="white" className="text-white" />
          </div>
          <span className="font-bold text-base tracking-tight">Meckury AI</span>
        </div>
      </header>

      {/* ── Page body ─────────────────────────────────────── */}
      <div className="flex flex-1 lg:min-h-dvh">

        <LeftPanel />

        {/* Right: form panel */}
        <div className="flex flex-col flex-1 pt-14 lg:pt-0 lg:max-w-lg xl:max-w-xl">
          <div className="flex flex-col flex-1 justify-center px-8 py-12">
            <AnimatePresence mode="wait">

              {/* Landing */}
              {view === VIEWS.LANDING && (
                <motion.div key="landing" {...fadeIn} className="flex flex-col gap-6">
                  <div>
                    <h1 className="text-3xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>
                      Get started
                    </h1>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      Create stunning AI content in seconds
                    </p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <PrimaryButton onClick={() => setView(VIEWS.EMAIL_ENTRY)}>
                      Get started free
                    </PrimaryButton>
                    <SecondaryButton onClick={() => setView(VIEWS.LOGIN)}>
                      Sign in
                    </SecondaryButton>
                    <OrDivider />
                    <GoogleButton />
                  </div>
                  <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                    By continuing you agree to our Terms &amp; Privacy Policy
                  </p>
                </motion.div>
              )}

              {/* Email Entry */}
              {view === VIEWS.EMAIL_ENTRY && (
                <motion.div key="email" {...slideIn} className="flex flex-col gap-6">
                  <BackButton />
                  <div>
                    <h2 className="text-3xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>
                      Create account
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      We'll send an 8-digit verification code to your email
                    </p>
                  </div>
                  <div className="flex flex-col gap-4">
                    <Input
                      label="Email address" type="email" value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com" icon={Mail} error={errors.email}
                      autoComplete="email" autoFocus
                    />
                    <PrimaryButton onClick={handleSendOTP}>
                      Send verification code
                    </PrimaryButton>
                    <OrDivider />
                    <GoogleButton />
                  </div>
                  <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                    Already have an account?{' '}
                    <button onClick={() => setView(VIEWS.LOGIN)} className="font-semibold" style={{ color: 'var(--brand)' }}>
                      Sign in
                    </button>
                  </p>
                </motion.div>
              )}

              {/* OTP Verify */}
              {view === VIEWS.OTP_VERIFY && (
                <motion.div key="otp" {...slideIn} className="flex flex-col gap-6">
                  <BackButton />
                  <div>
                    <h2 className="text-3xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>
                      Check your email
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      We sent a code to{' '}
                      <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>
                    </p>
                  </div>
                  <div className="flex flex-col gap-4">
                    <Input
                      label="Verification code" type="text" inputMode="numeric"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      placeholder="Enter 8-digit code" error={errors.otp}
                      autoComplete="one-time-code" autoFocus maxLength={8}
                    />
                    <PrimaryButton onClick={handleVerifyOTP}>Verify code</PrimaryButton>
                    <button
                      onClick={handleSendOTP}
                      className="text-sm text-center font-medium"
                      style={{ color: 'var(--brand)' }}
                    >
                      Resend code
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Set Password */}
              {view === VIEWS.SET_PASSWORD && (
                <motion.div key="set-password" {...slideIn} className="flex flex-col gap-6">
                  <BackButton />
                  <div>
                    <h2 className="text-3xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>
                      Set a password
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      Choose a strong password to secure your account
                    </p>
                  </div>
                  <div className="flex flex-col gap-4">
                    <Input
                      label="Password" type="password" value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters" icon={Lock}
                      error={errors.newPassword} autoFocus autoComplete="new-password"
                    />
                    <Input
                      label="Confirm password" type="password" value={confirmPass}
                      onChange={(e) => setConfirmPass(e.target.value)}
                      placeholder="Repeat your password" icon={Lock}
                      error={errors.confirmPass} autoComplete="new-password"
                    />
                    <PrimaryButton onClick={handleSetPassword}>Continue</PrimaryButton>
                  </div>
                </motion.div>
              )}

              {/* Set Profile */}
              {view === VIEWS.SET_PROFILE && (
                <motion.div key="profile" {...slideIn} className="flex flex-col gap-6">
                  <BackButton />
                  <div>
                    <h2 className="text-3xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>
                      Set up profile
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      Almost there! Choose your username
                    </p>
                  </div>
                  <div className="flex flex-col gap-4">
                    <Input
                      label="Username" value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase())}
                      placeholder="yourname" icon={User} error={errors.username}
                      hint="Letters, numbers and underscores only"
                      maxLength={30} autoFocus
                    />
                    <Input
                      label="Display name (optional)" value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your Name" icon={User} maxLength={50}
                    />
                    <PrimaryButton onClick={handleSetProfile}>Start creating 🎉</PrimaryButton>
                  </div>
                </motion.div>
              )}

              {/* Login */}
              {view === VIEWS.LOGIN && (
                <motion.div key="login" {...slideIn} className="flex flex-col gap-6">
                  <BackButton />
                  <div>
                    <h2 className="text-3xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>
                      Welcome back
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      Sign in to your account
                    </p>
                  </div>
                  <div className="flex flex-col gap-4">
                    <Input
                      label="Email address" type="email" value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com" icon={Mail} error={errors.email}
                      autoComplete="email" autoFocus
                    />
                    <Input
                      label="Password" type="password" value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••" icon={Lock} error={errors.password}
                      autoComplete="current-password"
                    />
                    <button
                      onClick={() => setView(VIEWS.FORGOT_PASSWORD)}
                      className="text-sm text-right font-medium -mt-2"
                      style={{ color: 'var(--brand)' }}
                    >
                      Forgot password?
                    </button>
                    <PrimaryButton onClick={handleLogin}>Sign in</PrimaryButton>
                    <OrDivider />
                    <GoogleButton />
                  </div>
                  <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                    Don't have an account?{' '}
                    <button onClick={() => setView(VIEWS.EMAIL_ENTRY)} className="font-semibold" style={{ color: 'var(--brand)' }}>
                      Sign up free
                    </button>
                  </p>
                </motion.div>
              )}

              {/* Forgot Password */}
              {view === VIEWS.FORGOT_PASSWORD && (
                <motion.div key="forgot" {...slideIn} className="flex flex-col gap-6">
                  <BackButton />
                  <div>
                    <h2 className="text-3xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>
                      Reset password
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      Enter your email and we'll send a reset link
                    </p>
                  </div>
                  <div className="flex flex-col gap-4">
                    <Input
                      label="Email address" type="email" value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com" icon={Mail}
                      error={errors.email} autoFocus
                    />
                    <PrimaryButton onClick={handleForgotPassword}>Send reset link</PrimaryButton>
                  </div>
                </motion.div>
              )}

              {/* Reset Sent */}
              {view === VIEWS.RESET_SENT && (
                <motion.div key="reset-sent" {...scaleIn} className="flex flex-col items-center text-center gap-6">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                  >
                    <Mail size={28} style={{ color: 'var(--text-primary)' }} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>
                      Check your email
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      We sent a reset link to{' '}
                      <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>
                    </p>
                  </div>
                  <SecondaryButton onClick={() => setView(VIEWS.LOGIN)}>
                    Back to sign in
                  </SecondaryButton>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
