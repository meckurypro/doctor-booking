import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, Film, Image, Layers, Wand2, ArrowRight, Star, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

// ============================================================
// LANDING PAGE
// Public marketing page — shown to logged-out visitors
// ============================================================

const FEATURES = [
  { icon: Film,   label: 'AI Video Generation',   desc: 'Text, image or frame-to-frame video in seconds' },
  { icon: Image,  label: 'AI Image Generation',   desc: 'Stunning portraits and scenes from any prompt'  },
  { icon: Layers, label: 'Cinematic Templates',   desc: 'Proven viral templates — one tap to generate'   },
  { icon: Wand2,  label: 'Prompt Enhancement',    desc: 'Claude AI refines your prompts automatically'   },
]

const PACKAGES = [
  { name: 'Starter',  credits: 10,  price: '₦4,500',  featured: false },
  { name: 'Standard', credits: 35,  price: '₦13,000', featured: true  },
  { name: 'Pro',      credits: 100, price: '₦32,000', featured: false },
  { name: 'Creator',  credits: 260, price: '₦72,000', featured: false },
]

const EXAMPLES = [
  'Nigerian Leaders 1960–Present',
  'Richest Pastors in Africa',
  'Office Handover Template',
  'Memory Lane Video',
  'African History Series',
  'Custom Brand Content',
]

// ── Fade up animation ──────────────────────────────────────

const FadeUp = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay, ease: 'easeOut' }}
  >
    {children}
  </motion.div>
)

// ── Landing Page ───────────────────────────────────────────

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      {/* ── NAVBAR ────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 h-14 flex items-center justify-between max-w-[480px] mx-auto"
        style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
            <Zap size={14} fill="white" className="text-white" />
          </div>
          <span className="font-black text-lg" style={{ fontFamily: 'Syne, sans-serif' }}>Meckury</span>
        </div>
        <Button onClick={() => navigate('/auth')} variant="primary" size="sm">
          Get started
        </Button>
      </nav>

      {/* ── HERO ──────────────────────────────────────────── */}
      <section className="px-6 pt-28 pb-16 text-center max-w-[480px] mx-auto">
        {/* Background glow */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-10 blur-3xl"
            style={{ background: 'var(--brand)' }} />
        </div>

        <FadeUp>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-6"
            style={{ background: 'rgba(249,115,22,0.1)', color: 'var(--brand)', border: '1px solid rgba(249,115,22,0.2)' }}>
            <Zap size={12} fill="currentColor" />
            ⚡ 5 free credits on signup
          </div>
        </FadeUp>

        <FadeUp delay={0.1}>
          <h1 className="text-4xl font-black leading-tight mb-4"
            style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '-0.03em' }}>
            Create stunning
            <span className="brand-gradient-text"> AI videos </span>
            in seconds
          </h1>
        </FadeUp>

        <FadeUp delay={0.2}>
          <p className="text-base mb-8 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Meckury is an AI content creation studio. Generate cinematic videos and images
            from templates or your own prompts — no skills required.
          </p>
        </FadeUp>

        <FadeUp delay={0.3}>
          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate('/auth')} variant="primary" size="lg" fullWidth icon={ArrowRight}>
              Start creating free
            </Button>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              No subscription · Credits never expire · Pay as you go
            </p>
          </div>
        </FadeUp>
      </section>

      {/* ── SOCIAL PROOF ──────────────────────────────────── */}
      <FadeUp>
        <section className="px-6 py-8 max-w-[480px] mx-auto">
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: '3M+',    label: 'Views generated' },
              { value: '24K+',   label: 'Community members' },
              { value: '1.9M',   label: 'Single video record' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl p-4 text-center"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <p className="text-2xl font-black" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--brand)' }}>
                  {stat.value}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </section>
      </FadeUp>

      {/* ── FEATURES ──────────────────────────────────────── */}
      <section className="px-6 py-8 max-w-[480px] mx-auto">
        <FadeUp>
          <h2 className="text-2xl font-black mb-6 text-center"
            style={{ fontFamily: 'Syne, sans-serif' }}>
            Everything you need to create
          </h2>
        </FadeUp>

        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map((f, i) => (
            <FadeUp key={f.label} delay={i * 0.08}>
              <div className="rounded-2xl p-4"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: 'rgba(249,115,22,0.1)' }}>
                  <f.icon size={20} style={{ color: 'var(--brand)' }} />
                </div>
                <p className="text-sm font-bold mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>{f.label}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── EXAMPLES ──────────────────────────────────────── */}
      <section className="px-6 py-8 max-w-[480px] mx-auto">
        <FadeUp>
          <h2 className="text-2xl font-black mb-2 text-center" style={{ fontFamily: 'Syne, sans-serif' }}>
            What people create
          </h2>
          <p className="text-sm text-center mb-6" style={{ color: 'var(--text-muted)' }}>
            From viral history content to brand videos
          </p>
        </FadeUp>

        <FadeUp delay={0.1}>
          <div className="flex flex-col gap-2">
            {EXAMPLES.map((ex) => (
              <div key={ex} className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{ background: 'var(--bg-elevated)' }}>
                <CheckCircle size={16} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{ex}</span>
              </div>
            ))}
          </div>
        </FadeUp>
      </section>

      {/* ── PRICING ───────────────────────────────────────── */}
      <section className="px-6 py-8 max-w-[480px] mx-auto">
        <FadeUp>
          <h2 className="text-2xl font-black mb-2 text-center" style={{ fontFamily: 'Syne, sans-serif' }}>
            Simple credit pricing
          </h2>
          <p className="text-sm text-center mb-6" style={{ color: 'var(--text-muted)' }}>
            Buy once, use anytime. Credits never expire.
          </p>
        </FadeUp>

        <div className="flex flex-col gap-3">
          {PACKAGES.map((pkg, i) => (
            <FadeUp key={pkg.name} delay={i * 0.08}>
              <div className="rounded-2xl p-4 flex items-center justify-between relative overflow-hidden"
                style={{
                  background: pkg.featured ? 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(234,88,12,0.06))' : 'var(--bg-card)',
                  border: pkg.featured ? '1.5px solid rgba(249,115,22,0.4)' : '1px solid var(--border)',
                }}>
                {pkg.featured && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{ background: 'var(--brand)', color: 'white', fontFamily: 'Syne, sans-serif' }}>
                    <Star size={10} fill="white" /> Best value
                  </div>
                )}
                <div>
                  <p className="font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>{pkg.name}</p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    <span style={{ color: 'var(--brand)' }}>⚡ {pkg.credits} credits</span>
                  </p>
                </div>
                <p className="text-xl font-black" style={{ fontFamily: 'Syne, sans-serif' }}>{pkg.price}</p>
              </div>
            </FadeUp>
          ))}
        </div>

        <FadeUp delay={0.3}>
          <div className="mt-4 flex flex-col gap-2">
            {[
              'Image generation from 1 credit',
              '5 second video from 2 credits',
              'Office Handover template — 2 credits',
              'Memory Lane — 1 credit per photo',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <Zap size={12} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{item}</span>
              </div>
            ))}
          </div>
        </FadeUp>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <FadeUp>
        <section className="px-6 py-12 max-w-[480px] mx-auto text-center">
          <div className="rounded-3xl p-8"
            style={{
              background: 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(234,88,12,0.06))',
              border: '1.5px solid rgba(249,115,22,0.25)',
            }}>
            <h2 className="text-2xl font-black mb-3" style={{ fontFamily: 'Syne, sans-serif' }}>
              Start creating today
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              Join thousands of creators making viral AI content. 5 free credits — no card required.
            </p>
            <Button onClick={() => navigate('/auth')} variant="primary" size="lg" fullWidth>
              Get 5 free credits →
            </Button>
          </div>
        </section>
      </FadeUp>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer className="px-6 py-6 text-center max-w-[480px] mx-auto"
        style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
            <Zap size={12} fill="white" className="text-white" />
          </div>
          <span className="font-black" style={{ fontFamily: 'Syne, sans-serif' }}>Meckury</span>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          © 2026 Meckury · AI Content Creation Platform
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          A <a href="https://linkai.africa" target="_blank" rel="noreferrer"
            style={{ color: 'var(--brand)' }}>LinkAI</a> product
        </p>
      </footer>

    </div>
  )
}
