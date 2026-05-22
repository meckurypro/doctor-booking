// src/pages/GeneratePage.jsx
import { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ChevronDown, Zap, Wand2 } from 'lucide-react'
import { useGenerate } from '@/hooks/useGenerate'
import { useAuth } from '@/context/AuthContext'
import { ImageUpload, MultiImageUpload } from '@/components/ui/ImageUpload'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { Loader, CreditBadge } from '@/components/ui/Modal'
import { calculateCreditCost } from '@/lib/creditUtils'  // import from shared utility
import toast from 'react-hot-toast'

// ─── Setting Chips ────────────────────────────────────────

const SettingChips = ({ label, options, value, onChange }) => (
  <div className="mb-4">
    <p
      className="text-xs font-semibold mb-2 uppercase tracking-wide"
      style={{ color: 'var(--text-muted)' }}
    >
      {label}
    </p>
    <div className="flex gap-2 flex-wrap">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150"
          style={{
            background: value === opt.value ? 'var(--brand)' : 'var(--bg-elevated)',
            color:      value === opt.value ? 'white' : 'var(--text-secondary)',
            fontFamily: 'Syne, sans-serif',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  </div>
)

// ─── Video models — only relevant for video generation types ─

const VIDEO_TYPES = new Set([
  'text_to_video',
  'image_to_video',
  'start_end_frame',
  'end_frame_text',
  'template',
])

// ─── Generate Page ────────────────────────────────────────

export default function GeneratePage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { credits } = useAuth()
  const { generate, status, isLoading } = useGenerate()

  const state = location.state || {}
  const {
    type,
    templateId,
    templateSlug,
    templateName,
    templateDescription,
    toolLabel,
    minImages    = 2,
    maxImages    = 2,
    creditCostPerImage,
  } = state

  // Guard: navigating directly to /generate without state is a broken state
  if (!type) return <Navigate to="/create" replace />

  // ── Derived flags ─────────────────────────────────────
  const isTemplate      = type === 'template'
  const isMemoryLane    = templateSlug === 'memory-lane'
  const isHandover      = templateSlug === 'office-handover'
  const needsStartFrame = ['image_to_video', 'start_end_frame', 'image_to_image'].includes(type) || isHandover
  const needsEndFrame   = ['start_end_frame', 'end_frame_text'].includes(type) || isHandover
  const needsPrompt     = !isTemplate && type !== 'start_end_frame'
  const isVideoType     = VIDEO_TYPES.has(type)
  // Model selector only makes sense for video generation
  const showModelPicker = isVideoType && !isTemplate

  // ── Form state ────────────────────────────────────────
  const [prompt,       setPrompt]       = useState('')
  const [startFrame,   setStartFrame]   = useState(null)
  const [endFrame,     setEndFrame]     = useState(null)
  const [imageFrames,  setImageFrames]  = useState([])
  const [aspectRatio,  setAspectRatio]  = useState('9:16')
  const [duration,     setDuration]     = useState('5')
  const [model,        setModel]        = useState('kling_2_5')
  const [showSettings, setShowSettings] = useState(false)

  // ── Credit estimation ─────────────────────────────────
  const estimatedCredits = creditCostPerImage
    ? creditCostPerImage * Math.max(imageFrames.length, minImages)
    : calculateCreditCost(
        isTemplate ? `template_${templateSlug?.replace(/-/g, '_')}` : type,
        { duration, imageCount: imageFrames.length || 1 }
      )

  const canAfford = credits >= parseFloat(estimatedCredits)

  // ── Generation handler ────────────────────────────────
  const handleGenerate = async () => {
    if (needsStartFrame && !startFrame)                 return toast.error('Please upload the first image')
    if (needsEndFrame && !endFrame)                     return toast.error('Please upload the second image')
    if (isMemoryLane && imageFrames.length < minImages) return toast.error(`Upload at least ${minImages} photos`)
    if (needsPrompt && !prompt.trim())                  return toast.error('Please enter a prompt')
    if (!canAfford)                                     return toast.error('Not enough credits. Please top up.')

    const result = await generate({
      type,
      templateId,
      templateSlug,
      prompt,
      startFrame,
      endFrame,
      imageFrames: isMemoryLane ? imageFrames : null,
      aspectRatio,
      duration,
      model,
    })

    if (result) {
      navigate(`/result/${result.generationId}`, {
        state: { outputUrl: result.outputUrl, outputType: result.outputType },
      })
    }
  }

  // ── Render ─────────────────────────────────────────────

  return (
    <div className="page-container min-h-dvh" style={{ background: 'var(--bg-primary)' }}>

      {/* Header */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-4 h-14"
        style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 p-2 -ml-2 rounded-xl"
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1
          className="text-base font-bold"
          style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}
        >
          {isTemplate ? templateName : toolLabel}
        </h1>
        <CreditBadge credits={credits} size="sm" />
      </div>

      {/* Loading overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
          >
            <div className="text-center px-8">
              <Loader size="lg" status={status} />
              <div className="mt-4 flex gap-1 justify-center">
                {['uploading', 'enhancing', 'generating'].map((s) => (
                  <div
                    key={s}
                    className="h-1 rounded-full transition-all duration-500"
                    style={{
                      width:      status === s ? 32 : 8,
                      background: status === s ? 'var(--brand)' : 'rgba(255,255,255,0.2)',
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-4 py-5 pb-32">

        {/* Template description */}
        {isTemplate && templateDescription && (
          <div
            className="mb-5 p-4 rounded-2xl"
            style={{
              background: 'rgba(249,115,22,0.08)',
              border:     '1px solid rgba(249,115,22,0.2)',
            }}
          >
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {templateDescription}
            </p>
          </div>
        )}

        {/* Memory Lane — multi image upload */}
        {isMemoryLane && (
          <div className="mb-5">
            <MultiImageUpload
              values={imageFrames}
              onChange={setImageFrames}
              minImages={minImages}
              maxImages={maxImages}
            />
          </div>
        )}

        {/* Start + End frame uploads */}
        {!isMemoryLane && (needsStartFrame || needsEndFrame) && (
          <div
            className={`mb-5 ${needsStartFrame && needsEndFrame ? 'grid grid-cols-2 gap-3' : ''}`}
          >
            {needsStartFrame && (
              <ImageUpload
                sublabel={needsEndFrame ? 'Start frame' : 'Upload image'}
                value={startFrame}
                onChange={setStartFrame}
                onRemove={() => setStartFrame(null)}
              />
            )}
            {needsEndFrame && (
              <ImageUpload
                sublabel="End frame"
                value={endFrame}
                onChange={setEndFrame}
                onRemove={() => setEndFrame(null)}
              />
            )}
          </div>
        )}

        {/* Prompt input */}
        {needsPrompt && (
          <div className="mb-5">
            <Textarea
              label="Prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want to create..."
              rows={3}
              maxLength={500}
              hint="Claude AI will enhance your prompt automatically"
            />
            <div className="flex items-center gap-1.5 mt-2">
              <Wand2 size={12} style={{ color: 'var(--brand)' }} />
              <p className="text-xs" style={{ color: 'var(--brand)' }}>
                AI prompt enhancement enabled
              </p>
            </div>
          </div>
        )}

        {/* Settings accordion */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 w-full py-3 px-4 rounded-2xl mb-2 transition-colors"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
        >
          <span
            className="text-sm font-semibold flex-1 text-left"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            Generation settings
          </span>
          <motion.div animate={{ rotate: showSettings ? 180 : 0 }}>
            <ChevronDown size={18} />
          </motion.div>
        </button>

        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-3 pb-1 px-1">
                <SettingChips
                  label="Aspect Ratio"
                  options={[
                    { label: '9:16 Portrait',  value: '9:16' },
                    { label: '16:9 Landscape', value: '16:9' },
                    { label: '1:1 Square',     value: '1:1'  },
                  ]}
                  value={aspectRatio}
                  onChange={setAspectRatio}
                />

                {isVideoType && (
                  <SettingChips
                    label="Duration"
                    options={[
                      { label: '5s',  value: '5'  },
                      { label: '8s',  value: '8'  },
                      { label: '10s', value: '10' },
                    ]}
                    value={duration}
                    onChange={setDuration}
                  />
                )}

                {/* Model picker only for video types — Kling/Seedance are video models */}
                {showModelPicker && (
                  <SettingChips
                    label="AI Model"
                    options={[
                      { label: 'Kling 2.5', value: 'kling_2_5'     },
                      { label: 'Seedance',  value: 'seedance_1_5'  },
                    ]}
                    value={model}
                    onChange={setModel}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky Generate Button */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 p-4 safe-bottom"
        style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}
      >
        <div className="max-w-[480px] mx-auto">
          <Button
            onClick={handleGenerate}
            loading={isLoading}
            disabled={!canAfford}
            variant="primary"
            size="lg"
            fullWidth
          >
            <Zap size={18} fill="white" />
            Generate · {estimatedCredits} credits
          </Button>
          {!canAfford && (
            <p className="text-xs text-center mt-2 text-red-500">
              Not enough credits.{' '}
              <button
                onClick={() => navigate('/profile')}
                className="underline font-semibold"
              >
                Top up here
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
