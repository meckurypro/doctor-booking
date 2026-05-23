import { motion } from 'framer-motion'
import { ArrowRight, Star, Lock, Zap } from 'lucide-react'

// ============================================================
// TEMPLATE CARD
// Used on PromptIQPage (staff) and FeedPage (public templates).
// ============================================================

export const TemplateCard = ({
  template,     // DB template row or template definition object
  onClick,
  variant = 'default', // 'default' | 'compact' | 'featured'
  index   = 0,
  showVisibilityBadge = false,
}) => {
  const isPromptIQ = template.visibility === 'promptiq'
  const creditLabel = template.credit_cost_per_image
    ? `${template.credit_cost_per_image} cr/photo`
    : `${template.credit_cost ?? 2} credits`

  if (variant === 'compact') {
    return (
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.06 }}
        whileTap={{ scale: 0.97 }}
        onClick={onClick}
        className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all"
        style={{
          background: 'var(--bg-card)',
          border:     '1px solid var(--border)',
        }}
      >
        {/* Thumbnail / icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 relative overflow-hidden"
          style={{
            background: template.thumbnail_url
              ? undefined
              : 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(234,88,12,0.1))',
          }}
        >
          {template.thumbnail_url ? (
            <img src={template.thumbnail_url} alt={template.name} className="w-full h-full object-cover" />
          ) : (
            <Zap size={24} style={{ color: 'var(--brand)' }} />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3
              className="text-sm font-bold truncate"
              style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}
            >
              {template.name}
            </h3>
            {showVisibilityBadge && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0"
                style={{
                  background: isPromptIQ ? 'rgba(249,115,22,0.12)' : 'rgba(16,185,129,0.12)',
                  color:      isPromptIQ ? 'var(--brand)' : '#10b981',
                }}
              >
                {isPromptIQ ? 'PromptIQ' : 'Public'}
              </span>
            )}
          </div>
          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
            {template.description}
          </p>
          <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--brand)' }}>
            {isPromptIQ ? '⚡ Free for staff' : `⚡ ${creditLabel}`}
          </p>
        </div>

        <ArrowRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      </motion.button>
    )
  }

  // Default card (grid layout)
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full rounded-3xl overflow-hidden text-left relative"
      style={{
        background: 'var(--bg-card)',
        border:     '1px solid var(--border)',
        boxShadow:  'var(--shadow-md)',
      }}
    >
      {/* Thumbnail */}
      <div
        className="h-36 w-full relative flex items-center justify-center"
        style={{
          background: template.thumbnail_url
            ? undefined
            : 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(234,88,12,0.08))',
        }}
      >
        {template.thumbnail_url ? (
          <img
            src={template.thumbnail_url}
            alt={template.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Zap size={40} style={{ color: 'var(--brand)', opacity: 0.4 }} />
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          {template.is_featured && (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold"
              style={{ background: 'var(--brand)', color: 'white', fontFamily: 'Syne, sans-serif' }}
            >
              <Star size={10} fill="white" />
              Featured
            </div>
          )}
          {showVisibilityBadge && (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold"
              style={{
                background: isPromptIQ ? 'rgba(0,0,0,0.6)' : 'rgba(16,185,129,0.8)',
                color: 'white',
                backdropFilter: 'blur(8px)',
              }}
            >
              {isPromptIQ && <Lock size={8} />}
              {isPromptIQ ? 'PromptIQ' : 'Public'}
            </div>
          )}
        </div>

        <div
          className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-bold"
          style={{ background: 'rgba(0,0,0,0.5)', color: 'white', backdropFilter: 'blur(8px)' }}
        >
          {isPromptIQ ? '⚡ Free' : `⚡ ${creditLabel}`}
        </div>
      </div>

      {/* Info */}
      <div className="p-4 flex items-center justify-between">
        <div>
          <h3
            className="font-bold text-base"
            style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}
          >
            {template.name}
          </h3>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {template.description}
          </p>
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
            {template.min_images === template.max_images
              ? `${template.min_images} image${template.min_images !== 1 ? 's' : ''} required`
              : `${template.min_images ?? 1}–${template.max_images ?? 2} images`}
          </p>
        </div>
        <div
          className="ml-4 w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(249,115,22,0.1)' }}
        >
          <ArrowRight size={18} style={{ color: 'var(--brand)' }} />
        </div>
      </div>
    </motion.button>
  )
}
