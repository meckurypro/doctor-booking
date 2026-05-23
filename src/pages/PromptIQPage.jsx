import { useState, useEffect } from 'react'
import { useNavigate }          from 'react-router-dom'
import { motion }               from 'framer-motion'
import { X, Zap, Lock, Users, TrendingUp } from 'lucide-react'
import { supabase }             from '@/lib/supabase'
import { useAuth }              from '@/context/AuthContext'
import { TemplateCard }         from '@/components/templates/TemplateCard'
import { TemplateRunner }       from '@/components/templates/TemplateRunner'
import { Skeleton }             from '@/components/ui/Modal'

// ============================================================
// PROMPTIQ PAGE
// Staff-only workspace. Appears as a full-screen sheet
// triggered by the PromptIQ button in BottomNav / TopBar.
//
// Layout (Hailuo-inspired):
//   Header      — PromptIQ branding + close button
//   Stats strip — pool balance, total gens today
//   Template gallery — compact list, staff can scroll and tap
//   → Tapping opens TemplateRunner inline (slide-in)
// ============================================================

export default function PromptIQPage({ onClose }) {
  const navigate               = useNavigate()
  const { user, profile }      = useAuth()

  const [templates,     setTemplates]     = useState([])
  const [loading,       setLoading]       = useState(true)
  const [poolBalance,   setPoolBalance]   = useState(null)
  const [activeTemplate, setActiveTemplate] = useState(null) // selected DB template row
  const [todayCount,    setTodayCount]    = useState(0)

  // ── Load PromptIQ templates ─────────────────────────────
  useEffect(() => {
    const load = async () => {
      // Staff can see promptiq + public templates
      const { data } = await supabase
        .from('templates')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      setTemplates(data || [])

      // Load pool balance from settings
      const { data: settings } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'staff_pool_user_id')
        .single()

      if (settings?.value) {
        const { data: poolProfile } = await supabase
          .from('profiles')
          .select('credits')
          .eq('id', settings.value)
          .single()

        setPoolBalance(poolProfile?.credits ?? null)
      }

      // Today's staff generation count for this user
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const { count } = await supabase
        .from('staff_activity')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', user.id)
        .gte('created_at', today.toISOString())

      setTodayCount(count || 0)
      setLoading(false)
    }
    load()
  }, [user.id])

  // Split by visibility
  const promptiqTemplates = templates.filter((t) => t.visibility === 'promptiq')
  const publicTemplates   = templates.filter((t) => t.visibility === 'public')

  // ── Render: TemplateRunner (slide-in) ───────────────────
  if (activeTemplate) {
    return (
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed inset-0 z-50"
        style={{ background: 'var(--bg-primary)' }}
      >
        {/* Sub-header */}
        <div
          className="sticky top-0 z-10 flex items-center gap-3 px-4 h-14"
          style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}
        >
          <button
            onClick={() => setActiveTemplate(null)}
            className="p-2 -ml-2 rounded-xl"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Back to template list"
          >
            <X size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-sm font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
              {activeTemplate.name}
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {activeTemplate.visibility === 'promptiq' ? '⚡ Free for staff' : `⚡ ${activeTemplate.credit_cost} credits`}
            </p>
          </div>
          {/* Pool balance chip */}
          {poolBalance !== null && (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold"
              style={{ background: 'rgba(249,115,22,0.1)', color: 'var(--brand)' }}
            >
              <Zap size={10} fill="currentColor" />
              Pool: {Math.floor(poolBalance)}
            </div>
          )}
        </div>

        <TemplateRunner
          template={activeTemplate}
          isStaff
          onBack={() => setActiveTemplate(null)}
        />
      </motion.div>
    )
  }

  // ── Main workspace ──────────────────────────────────────
  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 32, stiffness: 300 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 h-14 flex-shrink-0"
        style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
          >
            <Zap size={14} fill="white" className="text-white" />
          </div>
          <div>
            <span className="font-black text-base" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
              PromptIQ
            </span>
            <span className="text-xs ml-1.5" style={{ color: 'var(--text-muted)' }}>
              Studio
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl"
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Close PromptIQ"
        >
          <X size={20} />
        </button>
      </div>

      {/* Stats strip */}
      <div
        className="flex items-center gap-4 px-4 py-3 flex-shrink-0"
        style={{ background: 'rgba(249,115,22,0.04)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-1.5">
          <Lock size={12} style={{ color: 'var(--brand)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            Staff access
          </span>
        </div>
        <div className="h-3 w-px" style={{ background: 'var(--border)' }} />
        {poolBalance !== null && (
          <div className="flex items-center gap-1">
            <Zap size={12} fill="var(--brand)" style={{ color: 'var(--brand)' }} />
            <span className="text-xs font-bold" style={{ color: 'var(--brand)' }}>
              {Math.floor(poolBalance)} pool credits
            </span>
          </div>
        )}
        <div className="h-3 w-px" style={{ background: 'var(--border)' }} />
        <div className="flex items-center gap-1">
          <TrendingUp size={12} style={{ color: 'var(--text-muted)' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {todayCount} today
          </span>
        </div>
      </div>

      {/* Scrollable template list */}
      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-24 no-scrollbar">

        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : (
          <>
            {/* PromptIQ templates */}
            {promptiqTemplates.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Lock size={12} style={{ color: 'var(--brand)' }} />
                  <p
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: 'var(--brand)', fontFamily: 'Syne, sans-serif' }}
                  >
                    PromptIQ Templates
                  </p>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(249,115,22,0.1)', color: 'var(--brand)' }}
                  >
                    Free
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {promptiqTemplates.map((t, i) => (
                    <TemplateCard
                      key={t.id}
                      template={t}
                      variant="compact"
                      index={i}
                      onClick={() => setActiveTemplate(t)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Public templates (staff can use too, costs credits) */}
            {publicTemplates.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users size={12} style={{ color: 'var(--text-muted)' }} />
                  <p
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)', fontFamily: 'Syne, sans-serif' }}
                  >
                    Public Templates
                  </p>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                  >
                    Uses credits
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {publicTemplates.map((t, i) => (
                    <TemplateCard
                      key={t.id}
                      template={t}
                      variant="compact"
                      index={i}
                      onClick={() => setActiveTemplate(t)}
                    />
                  ))}
                </div>
              </div>
            )}

            {templates.length === 0 && (
              <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                <Zap size={32} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">No templates yet</p>
                <p className="text-xs mt-1">Admin can add templates from the Admin Panel</p>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  )
}
