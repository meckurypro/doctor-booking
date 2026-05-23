// src/components/ui/Modal.jsx
import { motion, AnimatePresence } from 'framer-motion'
import { X, Zap } from 'lucide-react'

// ============================================================
// MODAL
// ============================================================

export const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full mx-4',
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full ${sizes[size]} rounded-t-3xl sm:rounded-3xl overflow-hidden`}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              {/* Header */}
              {title && (
                <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
                  <h2 className="text-lg font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
                    {title}
                  </h2>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl transition-colors hover:opacity-70"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                  >
                    <X size={18} />
                  </button>
                </div>
              )}

              {/* Content */}
              <div className="p-5">
                {children}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ============================================================
// LOADER
// ============================================================

export const Loader = ({ size = 'md', text, status }) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }

  const statusMessages = {
    uploading: 'Uploading your images...',
    enhancing: 'Enhancing your prompt with AI...',
    generating: 'Creating your masterpiece...',
    processing: 'Processing...',
  }

  const displayText = text || statusMessages[status] || 'Loading...'

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8">
      <div className="relative">
        {/* Outer ring */}
        <div className={`${sizes[size]} rounded-full border-2 opacity-20`} style={{ borderColor: 'var(--brand)' }} />
        {/* Spinning ring */}
        <div className={`${sizes[size]} rounded-full border-2 border-transparent absolute inset-0 animate-spin`}
          style={{ borderTopColor: 'var(--brand)' }} />
        {/* Center dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--brand)' }} />
        </div>
      </div>

      {displayText && (
        <p className="text-sm text-center animate-pulse" style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
          {displayText}
        </p>
      )}
    </div>
  )
}

// ============================================================
// SKELETON LOADER
// ============================================================

export const Skeleton = ({ className = '', rounded = 'rounded-xl' }) => (
  <div className={`shimmer ${rounded} ${className}`} />
)

// ============================================================
// CREDIT BADGE
// ============================================================

export const CreditBadge = ({ credits, size = 'md', showIcon = true }) => {
  const sizes = {
    sm: 'text-xs px-2 py-1 gap-1',
    md: 'text-sm px-3 py-1.5 gap-1.5',
    lg: 'text-base px-4 py-2 gap-2',
  }

  const iconSizes = { sm: 12, md: 14, lg: 16 }

  return (
    <div
      title={`${credits} credits available`}
      className={`inline-flex items-center font-bold rounded-full ${sizes[size]}`}
      style={{
        background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(234,88,12,0.1))',
        border: '1px solid rgba(249,115,22,0.3)',
        color: 'var(--brand)',
        fontFamily: 'Syne, sans-serif',
      }}
    >
      {showIcon && <Zap size={iconSizes[size]} fill="currentColor" />}
      {typeof credits === 'number' ? credits.toFixed(0) : credits}
    </div>
  )
}

// ============================================================
// EMPTY STATE
// ============================================================

export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
    {Icon && (
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'var(--bg-elevated)' }}>
        <Icon size={28} style={{ color: 'var(--text-muted)' }} />
      </div>
    )}
    <h3 className="text-lg font-bold mb-2" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
      {title}
    </h3>
    {description && (
      <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--text-muted)' }}>
        {description}
      </p>
    )}
    {action}
  </div>
)

// ============================================================
// DIVIDER
// ============================================================

export const Divider = ({ text }) => (
  <div className="flex items-center gap-3 my-2">
    <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
    {text && <span className="text-xs px-2" style={{ color: 'var(--text-muted)' }}>{text}</span>}
    <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
  </div>
)
