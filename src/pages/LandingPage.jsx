// src/pages/LandingPage.jsx
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap } from 'lucide-react'

// ── Placeholder video/image reels ─────────────────────────
// These are example AI-generated video URLs. Replace with your
// actual Supabase storage URLs once you have real content.
const REEL_ITEMS = [
  {
    id: 1,
    type: 'gradient',
    colors: ['#1a0a00', '#f97316', '#7c2d12'],
    label: 'Office Handover',
  },
  {
    id: 2,
    type: 'gradient',
    colors: ['#000000', '#1c1c1c', '#2d2d2d'],
    label: 'Memory Lane',
  },
  {
    id: 3,
    type: 'gradient',
    colors: ['#0a0a1a', '#1e3a5f', '#0ea5e9'],
    label: 'AI Portrait',
  },
  {
    id: 4,
    type: 'gradient',
    colors: ['#0a1a0a', '#14532d', '#16a34a'],
    label: 'Brand Video',
  },
  {
    id: 5,
    type: 'gradient',
    colors: ['#1a0a1a', '#6b21a8', '#a855f7'],
    label: 'Cinematic',
  },
  {
    id: 6,
    type: 'gradient',
    colors: ['#1a1000', '#92400e', '#d97706'],
    label: 'History',
  },
]

// ── Reel card ─────────────────────────────────────────────
const ReelCard = ({ item, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.4 + index * 0.08, duration: 0.5, ease: 'easeOut' }}
    className="relative flex-shrink-0 rounded-2xl overflow-hidden"
    style={{
      width:  '140px',
      height: '200px',
      background: `linear-gradient(160deg, ${item.colors[0]}, ${item.colors[1]}, ${item.colors[2]})`,
    }}
  >
    {/* Shimmer overlay */}
    <div
      className="absolute inset-0"
      style={{
        background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.7) 100%)',
      }}
    />
    {/* Label */}
    <div className="absolute bottom-0 left-0 right-0 p-3">
      <p
        className="text-white text-xs font-semibold leading-tight"
        style={{ fontFamily: 'Inter, sans-serif', opacity: 0.85 }}
      >
        {item.label}
      </p>
    </div>
    {/* Play dot */}
    <div className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
      style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)' }}>
      <div className="w-0 h-0 ml-0.5"
        style={{
          borderTop: '4px solid transparent',
          borderBottom: '4px solid transparent',
          borderLeft: '6px solid white',
        }}
      />
    </div>
  </motion.div>
)

// ── Landing Page ──────────────────────────────────────────

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      {/* ── Top bar ─────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 h-14 max-w-[480px] mx-auto w-full"
        style={{
          background:          'var(--bg-primary)',
          borderBottom:        '1px solid var(--border)',
          backdropFilter:      'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
          >
            <Zap size={14} fill="white" className="text-white" />
          </div>
          <span className="font-bold text-base tracking-tight">Meckury</span>
        </div>

        {/* Sign in */}
        <button
          onClick={() => navigate('/auth')}
          className="text-sm font-semibold px-4 py-2 rounded-xl transition-all"
          style={{
            background: 'var(--bg-elevated)',
            color:      'var(--text-primary)',
          }}
        >
          Sign in
        </button>
      </motion.header>

      {/* ── Hero ────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col pt-14 max-w-[480px] mx-auto w-full">

        {/* Headline block */}
        <div className="px-5 pt-12 pb-8">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="text-xs font-semibold uppercase tracking-widest mb-4"
            style={{ color: 'var(--brand)' }}
          >
            AI Content Studio
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
            className="text-4xl font-black leading-none tracking-tight mb-5"
            style={{ letterSpacing: '-0.04em' }}
          >
            Create.
            <br />
            <span style={{ color: 'var(--text-muted)' }}>Go viral.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="text-sm leading-relaxed mb-8"
            style={{ color: 'var(--text-muted)', maxWidth: '280px' }}
          >
            Cinematic AI videos and images in seconds.
            No skills required.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="flex flex-col gap-3"
          >
            <button
              onClick={() => navigate('/auth')}
              className="w-full py-4 rounded-2xl text-sm font-bold tracking-tight transition-all active:scale-[0.98]"
              style={{
                background: 'var(--text-primary)',
                color:      'var(--text-inverse)',
              }}
            >
              Get started free →
            </button>

            <button
              onClick={() => navigate('/auth')}
              className="w-full py-4 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]"
              style={{
                background: 'var(--bg-elevated)',
                color:      'var(--text-secondary)',
                border:     '1px solid var(--border)',
              }}
            >
              Sign in
            </button>

          </motion.div>
        </div>

        {/* ── Video reel strip ──────────────────────────── */}
        <div className="pb-12">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="px-5 text-xs font-semibold uppercase tracking-widest mb-4"
            style={{ color: 'var(--text-muted)' }}
          >
            Made with Meckury
          </motion.p>

          {/* Horizontal scroll reel */}
          <div
            className="flex gap-3 overflow-x-auto no-scrollbar px-5 pb-2"
          >
            {REEL_ITEMS.map((item, i) => (
              <ReelCard key={item.id} item={item} index={i} />
            ))}
            {/* End spacer */}
            <div className="flex-shrink-0 w-1" />
          </div>
        </div>

        {/* ── Bottom strip ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.4 }}
          className="px-5 pb-8 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}
        >
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            By{' '}
            <a
              href="https://linkai.africa"
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--text-secondary)' }}
            >
              LinkAI
            </a>
          </p>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/auth')}
              className="text-xs font-semibold"
              style={{ color: 'var(--text-muted)' }}
            >
              Terms
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="text-xs font-semibold"
              style={{ color: 'var(--text-muted)' }}
            >
              Privacy
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
