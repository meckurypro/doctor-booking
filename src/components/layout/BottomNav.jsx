// src/components/layout/BottomNav.jsx
import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Sparkles, Film, User } from 'lucide-react'

// ============================================================
// BOTTOM NAVIGATION
// History tab replaces Explore in MVP — same user journey
// ============================================================

const NAV_ITEMS = [
  { path: '/feed',    icon: Home,     label: 'Home'    },
  { path: '/create',  icon: Sparkles, label: 'Create'  },
  { path: '/history', icon: Film,     label: 'History' },
  { path: '/profile', icon: User,     label: 'Profile' },
]

export const BottomNav = () => {
  const location = useLocation()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 safe-bottom"
      style={{
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className="max-w-[480px] mx-auto flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname.startsWith(path)
          return (
            <NavLink
              key={path}
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
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} fill={isActive ? 'rgba(249,115,22,0.15)' : 'none'} />
              <span className="text-xs font-medium relative z-10" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px' }}>
                {label}
              </span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
