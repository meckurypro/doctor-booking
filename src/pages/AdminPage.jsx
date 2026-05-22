import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Users, Zap, Film, DollarSign,
  Edit3, Save, X, CheckCircle, XCircle,
  RotateCcw, TrendingUp, Clock, AlertTriangle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Modal'
import toast from 'react-hot-toast'

// ============================================================
// STAT CARD
// ============================================================

const StatCard = ({ icon: Icon, label, value, color = 'var(--brand)', sub }) => (
  <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
    <div className="flex items-center gap-2 mb-2">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center"
        style={{ background: `${color}20` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</span>
    </div>
    <p className="text-2xl font-black" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
      {value}
    </p>
    {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
  </div>
)

// ============================================================
// PROMPT EDITOR
// ============================================================

const PromptEditor = ({ template, onSave }) => {
  const { user } = useAuth()
  const [prompts, setPrompts] = useState([])
  const [editingPrompt, setEditingPrompt] = useState('')
  const [editingNotes, setEditingNotes] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPrompts()
  }, [template.id])

  const loadPrompts = async () => {
    const { data } = await supabase
      .from('template_prompts')
      .select('*')
      .eq('template_id', template.id)
      .order('version_number', { ascending: false })
    setPrompts(data || [])
    const active = data?.find(p => p.is_active)
    if (active) setEditingPrompt(active.prompt_text)
    setLoading(false)
  }

  const handleSave = async () => {
    if (!editingPrompt.trim()) return toast.error('Prompt cannot be empty')
    setSaving(true)

    const { data, error } = await supabase.rpc('save_prompt_version', {
      p_admin_id: user.id,
      p_template_id: template.id,
      p_prompt_text: editingPrompt,
      p_notes: editingNotes || null,
    })

    setSaving(false)

    if (error || !data?.success) {
      toast.error('Failed to save prompt')
      return
    }

    toast.success(`Saved as version ${data.version}!`)
    setIsEditing(false)
    setEditingNotes('')
    loadPrompts()
    onSave?.()
  }

  const handleRollback = async (promptId) => {
    const { data, error } = await supabase.rpc('rollback_prompt_version', {
      p_admin_id: user.id,
      p_prompt_id: promptId,
    })

    if (error || !data?.success) {
      toast.error('Failed to rollback')
      return
    }

    toast.success('Rolled back to this version!')
    loadPrompts()
  }

  const activePrompt = prompts.find(p => p.is_active)

  return (
    <div className="rounded-2xl overflow-hidden mb-4"
      style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
        <div>
          <h3 className="font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
            {template.name}
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {prompts.length} version{prompts.length !== 1 ? 's' : ''} · Used {template.usage_count} times
          </p>
        </div>
        {!isEditing ? (
          <Button
            onClick={() => setIsEditing(true)}
            variant="outline"
            size="sm"
            icon={Edit3}
          >
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={() => setIsEditing(false)} variant="ghost" size="sm" icon={X}>Cancel</Button>
            <Button onClick={handleSave} loading={saving} variant="primary" size="sm" icon={Save}>Save</Button>
          </div>
        )}
      </div>

      {/* Active prompt */}
      <div className="p-4">
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : isEditing ? (
          <div className="flex flex-col gap-3">
            <textarea
              value={editingPrompt}
              onChange={(e) => setEditingPrompt(e.target.value)}
              rows={5}
              className="input-base resize-none font-mono text-sm"
              style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px' }}
            />
            <input
              value={editingNotes}
              onChange={(e) => setEditingNotes(e.target.value)}
              placeholder="Version notes (optional)..."
              className="input-base text-sm"
            />
          </div>
        ) : activePrompt ? (
          <p className="text-sm leading-relaxed"
            style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)', fontSize: '12px' }}>
            {activePrompt.prompt_text}
          </p>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No active prompt</p>
        )}
      </div>

      {/* Version history */}
      {prompts.length > 1 && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <p className="px-4 py-2 text-xs font-bold uppercase tracking-wide"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}>
            Version history
          </p>
          {prompts.map((p) => (
            <div key={p.id}
              className="flex items-start gap-3 px-4 py-3"
              style={{ borderTop: '1px solid var(--border)' }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                    v{p.version_number}
                  </span>
                  {p.is_active && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'rgba(249,115,22,0.15)', color: 'var(--brand)' }}>
                      Active
                    </span>
                  )}
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(p.created_at).toLocaleDateString()}
                  </span>
                </div>
                {p.notes && (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.notes}</p>
                )}
              </div>
              {!p.is_active && (
                <button
                  onClick={() => handleRollback(p.id)}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors"
                  style={{ color: 'var(--brand)', background: 'rgba(249,115,22,0.1)' }}
                >
                  <RotateCcw size={10} />
                  Restore
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// FEED MODERATION
// ============================================================

const FeedModerationItem = ({ post, onApprove, onReject }) => (
  <div className="rounded-2xl overflow-hidden mb-3"
    style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
    <div className="flex gap-3 p-3">
      <div className="w-16 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-black">
        <img src={post.thumbnail_url} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          @{post.profiles?.username}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {post.templates?.name || post.output_type}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {new Date(post.created_at).toLocaleDateString()}
        </p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onApprove(post.id)}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl font-semibold"
            style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}
          >
            <CheckCircle size={12} /> Approve
          </button>
          <button
            onClick={() => onReject(post.id)}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl font-semibold"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
          >
            <XCircle size={12} /> Reject
          </button>
        </div>
      </div>
    </div>
  </div>
)

// ============================================================
// ADMIN PAGE
// ============================================================

export default function AdminPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [templates, setTemplates] = useState([])
  const [pendingPosts, setPendingPosts] = useState([])
  const [recentUsers, setRecentUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)

    const [statsRes, templatesRes, feedRes, usersRes] = await Promise.all([
      supabase.rpc('get_admin_stats'),
      supabase.from('templates').select('*').order('sort_order'),
      supabase.from('feed_posts')
        .select('*, profiles(username), templates(name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.from('profiles')
        .select('id, username, display_name, credits, total_generations, tier, created_at')
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    setStats(statsRes.data)
    setTemplates(templatesRes.data || [])
    setPendingPosts(feedRes.data || [])
    setRecentUsers(usersRes.data || [])
    setLoading(false)
  }

  const handleApprove = async (postId) => {
    const { data, error } = await supabase.rpc('approve_feed_post', {
      p_post_id: postId,
      p_admin_id: user.id,
    })
    if (data?.success) {
      setPendingPosts(prev => prev.filter(p => p.id !== postId))
      toast.success('Post approved!')
    } else {
      toast.error('Failed to approve')
    }
  }

  const handleReject = async (postId) => {
    const { data } = await supabase.rpc('approve_feed_post', {
      p_post_id: postId,
      p_admin_id: user.id,
      p_notes: 'Does not meet community guidelines',
    })
    // Update status to rejected directly
    await supabase.from('feed_posts').update({ status: 'rejected' }).eq('id', postId)
    setPendingPosts(prev => prev.filter(p => p.id !== postId))
    toast.success('Post rejected')
  }

  const TABS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'prompts', label: 'Prompts' },
    { id: 'feed', label: `Feed (${pendingPosts.length})` },
    { id: 'users', label: 'Users' },
  ]

  return (
    <div className="page-container min-h-dvh" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 flex items-center gap-3 px-4 h-14"
        style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => navigate('/profile')} className="p-2 -ml-2 rounded-xl"
          style={{ color: 'var(--text-secondary)' }}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-bold flex-1"
          style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
          Admin Panel
        </h1>
        <button onClick={loadData} className="p-2 rounded-xl" style={{ color: 'var(--text-muted)' }}>
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto px-4 py-3 no-scrollbar"
        style={{ borderBottom: '1px solid var(--border)' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all"
            style={{
              background: activeTab === tab.id ? 'var(--brand)' : 'var(--bg-elevated)',
              color: activeTab === tab.id ? 'white' : 'var(--text-muted)',
              fontFamily: 'Syne, sans-serif',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-5 pb-24">

        {/* ── DASHBOARD ──────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {loading ? (
              <div className="grid grid-cols-2 gap-3">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}
              </div>
            ) : stats ? (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <StatCard icon={Users} label="Total users" value={stats.total_users?.toLocaleString()}
                    sub={`+${stats.new_users_today} today`} />
                  <StatCard icon={Film} label="Total generations" value={stats.total_generations?.toLocaleString()}
                    sub={`${stats.generations_today} today`} color="#8b5cf6" />
                  <StatCard icon={TrendingUp} label="Success rate" value={`${stats.success_rate_today}%`}
                    sub="Today" color="#10b981" />
                  <StatCard icon={AlertTriangle} label="Failed today" value={stats.failed_today}
                    sub="Auto-refunded" color="#ef4444" />
                  <StatCard icon={DollarSign} label="Revenue (NGN)" value={`₦${stats.total_revenue_ngn?.toLocaleString()}`}
                    sub={`₦${stats.revenue_today_ngn?.toLocaleString()} today`} color="#10b981" />
                  <StatCard icon={Clock} label="Pending feed" value={stats.pending_feed_posts}
                    sub="Awaiting review" color="#eab308" />
                </div>
                <StatCard icon={Users} label="Active users today" value={stats.active_users_today}
                  color="#06b6d4" />
              </>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>Failed to load stats</p>
            )}
          </motion.div>
        )}

        {/* ── PROMPTS ────────────────────────────────── */}
        {activeTab === 'prompts' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Edit template prompts. Changes apply instantly to all new generations.
            </p>
            {templates.map((template) => (
              <PromptEditor
                key={template.id}
                template={template}
                onSave={loadData}
              />
            ))}
          </motion.div>
        )}

        {/* ── FEED MODERATION ────────────────────────── */}
        {activeTab === 'feed' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {pendingPosts.length === 0 ? (
              <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                <CheckCircle size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">All caught up! No pending posts.</p>
              </div>
            ) : (
              pendingPosts.map((post) => (
                <FeedModerationItem
                  key={post.id}
                  post={post}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))
            )}
          </motion.div>
        )}

        {/* ── USERS ──────────────────────────────────── */}
        {activeTab === 'users' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex flex-col gap-2">
              {recentUsers.map((u) => (
                <div key={u.id}
                  className="flex items-center gap-3 p-3 rounded-2xl"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                    style={{ background: 'var(--brand)', color: 'white', fontFamily: 'Syne, sans-serif' }}>
                    {u.username?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      @{u.username}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {u.total_generations} generations · ⚡{u.credits?.toFixed(1)} credits
                    </p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full capitalize"
                    style={{
                      background: 'rgba(249,115,22,0.1)',
                      color: 'var(--brand)',
                      fontFamily: 'Syne, sans-serif',
                    }}>
                    {u.tier}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </div>
    </div>
  )
}
