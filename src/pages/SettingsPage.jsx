import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Moon, Sun, Monitor, Lock, User, ChevronRight, Bell, Shield } from 'lucide-react'
import { auth, profiles } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import toast from 'react-hot-toast'

// ============================================================
// SETTINGS SECTION
// ============================================================

const Section = ({ title, children }) => (
  <div className="mb-6">
    <p className="text-xs font-bold uppercase tracking-widest mb-3 px-1"
      style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
      {title}
    </p>
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      {children}
    </div>
  </div>
)

const SettingRow = ({ icon: Icon, label, value, onClick, danger = false }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 p-4 transition-colors text-left"
    style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}
  >
    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: danger ? 'rgba(239,68,68,0.1)' : 'var(--bg-elevated)' }}>
      <Icon size={18} style={{ color: danger ? '#ef4444' : 'var(--text-secondary)' }} />
    </div>
    <span className="flex-1 text-sm font-medium"
      style={{ fontFamily: 'DM Sans, sans-serif', color: danger ? '#ef4444' : 'var(--text-primary)' }}>
      {label}
    </span>
    {value && (
      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{value}</span>
    )}
    <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
  </button>
)

// ============================================================
// SETTINGS PAGE
// ============================================================

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, profile, updateProfileLocal } = useAuth()
  const { theme, setTheme } = useTheme()

  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)

  // Change password state
  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [passLoading, setPassLoading] = useState(false)
  const [passErrors, setPassErrors] = useState({})

  // Edit profile state
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [profileLoading, setProfileLoading] = useState(false)

  const handleChangePassword = async () => {
    const errors = {}
    if (!newPass) errors.newPass = 'Required'
    else if (newPass.length < 8) errors.newPass = 'At least 8 characters'
    if (newPass !== confirmPass) errors.confirmPass = 'Passwords do not match'
    if (Object.keys(errors).length > 0) return setPassErrors(errors)

    setPassLoading(true)
    const { error } = await auth.updatePassword(newPass)
    setPassLoading(false)

    if (error) {
      toast.error(error.message || 'Failed to update password')
      return
    }

    toast.success('Password updated!')
    setShowChangePassword(false)
    setCurrentPass(''); setNewPass(''); setConfirmPass('')
  }

  const handleUpdateProfile = async () => {
    setProfileLoading(true)
    const { data, error } = await profiles.update(user.id, {
      display_name: displayName,
      bio,
    })
    setProfileLoading(false)

    if (error) {
      toast.error('Failed to update profile')
      return
    }

    updateProfileLocal(data)
    toast.success('Profile updated!')
    setShowEditProfile(false)
  }

  const themeLabels = { light: 'Light', dark: 'Dark', system: 'System' }
  const themeIcons = { light: Sun, dark: Moon, system: Monitor }

  return (
    <div className="page-container min-h-dvh" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 flex items-center gap-3 px-4 h-14"
        style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl"
          style={{ color: 'var(--text-secondary)' }}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
          Settings
        </h1>
      </div>

      <div className="px-4 py-5 pb-24">

        {/* Appearance */}
        <Section title="Appearance">
          <div className="p-4" style={{ background: 'var(--bg-card)' }}>
            <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Theme</p>
            <div className="flex gap-2">
              {(['light', 'dark', 'system']).map((t) => {
                const Icon = themeIcons[t]
                return (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className="flex-1 flex flex-col items-center gap-2 py-3 rounded-2xl transition-all text-sm font-semibold"
                    style={{
                      background: theme === t ? 'var(--brand)' : 'var(--bg-elevated)',
                      color: theme === t ? 'white' : 'var(--text-secondary)',
                      fontFamily: 'Syne, sans-serif',
                    }}
                  >
                    <Icon size={18} />
                    {themeLabels[t]}
                  </button>
                )
              })}
            </div>
          </div>
        </Section>

        {/* Account */}
        <Section title="Account">
          <SettingRow
            icon={User}
            label="Edit profile"
            value={profile?.display_name || profile?.username}
            onClick={() => setShowEditProfile(true)}
          />
          <SettingRow
            icon={Lock}
            label="Change password"
            onClick={() => setShowChangePassword(true)}
          />
          <SettingRow
            icon={Shield}
            label="Email address"
            value={user?.email}
            onClick={() => {}}
          />
        </Section>

        {/* App info */}
        <Section title="About">
          <div className="p-4 flex items-center justify-between" style={{ background: 'var(--bg-card)' }}>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Version</span>
            <span className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>0.1.0</span>
          </div>
        </Section>

      </div>

      {/* Change Password Modal */}
      <Modal
        isOpen={showChangePassword}
        onClose={() => { setShowChangePassword(false); setPassErrors({}) }}
        title="Change password"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="New password"
            type="password"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            placeholder="At least 8 characters"
            icon={Lock}
            error={passErrors.newPass}
            autoFocus
          />
          <Input
            label="Confirm new password"
            type="password"
            value={confirmPass}
            onChange={(e) => setConfirmPass(e.target.value)}
            placeholder="Repeat new password"
            icon={Lock}
            error={passErrors.confirmPass}
          />
          <Button
            onClick={handleChangePassword}
            loading={passLoading}
            variant="primary"
            size="lg"
            fullWidth
          >
            Update password
          </Button>
        </div>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        title="Edit profile"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            icon={User}
            maxLength={50}
            autoFocus
          />
          <div>
            <label className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--text-secondary)' }}>Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell the community about yourself..."
              rows={3}
              maxLength={160}
              className="input-base resize-none"
            />
            <p className="text-xs text-right mt-1" style={{ color: 'var(--text-muted)' }}>
              {bio.length}/160
            </p>
          </div>
          <Button
            onClick={handleUpdateProfile}
            loading={profileLoading}
            variant="primary"
            size="lg"
            fullWidth
          >
            Save changes
          </Button>
        </div>
      </Modal>
    </div>
  )
}
