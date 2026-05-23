import { useState }              from 'react'
import { NavLink, useLocation }  from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Sparkles, Film, User, Zap } from 'lucide-react'
import { useAuth }               from '@/context/AuthContext'
import PromptIQPage              from '@/pages/PromptIQPage'

// ============================================================
// BOTTOM NAVIGATION
// Staff users see a PromptIQ (⚡) button in the center.
// Tapping it opens the PromptIQ workspace as a full-screen sheet.
// Regular users see the standard 4-tab nav.
// ============================================================

const NAV_ITEMS = [
  { path: '/feed',    icon: Home,     label: 'Home'    },
  { path: '/create',  icon: Sparkles, label: 'Create'  },
  { path: '/history', icon: Film,     label: 'History' },
  { path: '/profile', icon: User,     label: 'Profile' },
]

// Staff nav — PromptIQ button inserted in the center
const STAFF_NAV_LEFT  = [
  { path: '/feed',    icon: Home,     label: 'Home'    },
  { path: '/create',  icon: Sparkles, label: 'Create'  },
]
const STAFF_NAV_RIGHT = [
  { path: '/history', icon: Film,     label: 'History' },
  { path: '/profile', icon: User,     label: 'Profile' },
]

// ── Tab item ──────────────────────────────────────────────

const NavItem = ({ path, icon: Icon, label, isActive }) => (
  <NavLink
    to={path}
    className="flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all duration-200 relative min-w-[60px]"
    style={{ color: isActive ? 'var(--brand)' : 'var(--text-muted)' }}
  >
    {isActive && (
      <motion.div
        layoutId="navIndicator"
        className="absolute inset-0 rounded-2xl"
        style={{ background: 'rgba(249,115,22,0.1)' }}
        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
      />
    )}
    <Icon
      size={22}
      strokeWidth={isActive ? 2.5 : 1.8}
      fill={isActive ? 'rgba(249,115,22,0.15)' : 'none'}
    />
    <span
      className="text-xs font-medium relative z-10"
      style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px' }}
    >
      {label}
    </span>
  </NavLink>
)

// ── PromptIQ center button ────────────────────────────────

const PromptIQButton = ({ onPress }) => (
  <motion.button
    whileTap={{ scale: 0.92 }}
    onClick={onPress}
    className="flex flex-col items-center gap-1 relative"
    aria-label="Open PromptIQ workspace"
  >
    {/* Glowing pill */}
    <div
      className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-brand"
      style={{
        background:  'linear-gradient(135deg, #f97316, #ea580c)',
        boxShadow:   '0 0 20px rgba(249,115,22,0.5)',
        marginTop:   '-20px', // float above nav
      }}
    >
      <Zap size={24} fill="white" className="text-white" />
    </div>
    <span
      className="text-xs font-bold"
      style={{ fontFamily: 'Syne, sans-serif', color: 'var(--brand)', fontSize: '10px' }}
    >
      PromptIQ
    </span>
  </motion.button>
)

// ── Bottom Nav ────────────────────────────────────────────

export const BottomNav = () => {
  const location          = useLocation()
  const { profile }       = useAuth()
  const isStaff           = profile?.is_staff === true || profile?.role === 'staff' || profile?.role === 'admin'
  const [showPIQ, setShowPIQ] = useState(false)

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 safe-bottom"
        style={{
          background:          'var(--bg-card)',
          borderTop:           '1px solid var(--border)',
          backdropFilter:      'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="max-w-[480px] mx-auto flex items-center justify-around px-2 py-2">

          {isStaff ? (
            // ── Staff layout: 2 tabs | PromptIQ | 2 tabs ──
            <>
              {STAFF_NAV_LEFT.map(({ path, icon, label }) => (
                <NavItem
                  key={path}
                  path={path}
                  icon={icon}
                  label={label}
                  isActive={location.pathname.startsWith(path)}
                />
              ))}

              <PromptIQButton onPress={() => setShowPIQ(true)} />

              {STAFF_NAV_RIGHT.map(({ path, icon, label }) => (
                <NavItem
                  key={path}
                  path={path}
                  icon={icon}
                  label={label}
                  isActive={location.pathname.startsWith(path)}
                />
              ))}
            </>
          ) : (
            // ── Regular layout: 4 tabs ─────────────────────
            NAV_ITEMS.map(({ path, icon, label }) => (
              <NavItem
                key={path}
                path={path}
                icon={icon}
                label={label}
                isActive={location.pathname.startsWith(path)}
              />
            ))
          )}
        </div>
      </nav>

      {/* PromptIQ workspace sheet */}
      <AnimatePresence>
        {showPIQ && (
          <PromptIQPage onClose={() => setShowPIQ(false)} />
        )}
      </AnimatePresence>
    </>
  )
}
