import { useState, useEffect } from 'react'
import { useNavigate }         from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Zap, Wand2, Info } from 'lucide-react'
import { getTemplate }            from '@/templates/index'
import { ImageUpload, MultiImageUpload } from '@/components/ui/ImageUpload'
import { Button }                 from '@/components/ui/Button'
import { Loader, CreditBadge }    from '@/components/ui/Modal'
import { useGenerate }            from '@/hooks/useGenerate'
import { useAuth }                from '@/context/AuthContext'
import { uploadImage }            from '@/lib/fal'
import toast                      from 'react-hot-toast'

// ── Setting chip selector ─────────────────────────────────

const SettingChips = ({ label, options, value, onChange }) => (
  <div className="mb-4">
    <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
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

// ============================================================
// TEMPLATE RUNNER
// Accepts either a DB template row (from Supabase) or a slug.
// Renders the correct input fields, handles upload + generation.
// ============================================================

export const TemplateRunner = ({
  template:    templateRow,   // DB row: { id, slug, name, visibility, credit_cost, ... }
  isStaff     = false,        // if true: no credit check, deduct from pool
  onBack,
}) => {
  const navigate                  = useNavigate()
  const { credits }               = useAuth()
  const { generate, status, isLoading } = useGenerate()

  // Resolve template definition from registry
  const def = getTemplate(templateRow?.slug)

  const [inputs,       setInputs]       = useState({})
  const [aspectRatio,  setAspectRatio]  = useState(templateRow?.default_aspect  || '9:16')
  const [duration,     setDuration]     = useState(templateRow?.default_duration || '5')
  const [model,        setModel]        = useState('kling_2_5')
  const [showSettings, setShowSettings] = useState(false)

  // Credit cost
  const estimatedCredits = (() => {
    if (isStaff) return 0 // staff use pool
    const imagesCount = inputs.imageFrames?.length || 1
    if (templateRow?.credit_cost_per_image) {
      return templateRow.credit_cost_per_image * Math.max(imagesCount, templateRow.min_images || 1)
    }
    return templateRow?.credit_cost ?? 2
  })()

  const canAfford = isStaff || credits >= estimatedCredits

  if (!def) {
    return (
      <div className="p-6 text-center" style={{ color: 'var(--text-muted)' }}>
        <p className="text-sm">Template "{templateRow?.slug}" not found in registry.</p>
        <p className="text-xs mt-1">Make sure the template file is imported in src/templates/index.js</p>
      </div>
    )
  }

  // ── Input change handler ────────────────────────────────
  const setInput = (key, value) => setInputs((prev) => ({ ...prev, [key]: value }))

  // ── Validate all required inputs ───────────────────────
  const validate = () => {
    for (const field of def.inputs) {
      if (!field.required) continue
      const val = inputs[field.key]
      if (field.type === 'multi_image') {
        if (!val || val.length < (field.minCount || 1)) {
          toast.error(`Upload at least ${field.minCount || 1} photos for ${field.label}`)
          return false
        }
      } else if (!val) {
        toast.error(`Please upload ${field.label}`)
        return false
      }
    }
    return true
  }

  // ── Handle generate ─────────────────────────────────────
  const handleGenerate = async () => {
    if (!validate()) return
    if (!canAfford) {
      toast.error('Not enough credits. Top up in your profile.')
      navigate('/profile')
      return
    }

    // Upload all image inputs first
    const uploadedInputs = {}
    for (const field of def.inputs) {
      const val = inputs[field.key]
      if (!val) continue

      if (field.type === 'image') {
        const { url, error } = await uploadImage(val)
        if (error) { toast.error(`Failed to upload ${field.label}`); return }
        uploadedInputs[field.key] = url
      } else if (field.type === 'multi_image') {
        const urls = []
        for (const file of val) {
          const { url, error } = await uploadImage(file)
          if (error) { toast.error('Failed to upload a photo'); return }
          urls.push(url)
        }
        uploadedInputs[field.key] = urls
      }
    }

    const result = await generate({
      type:         'template',
      templateId:   templateRow.id,
      templateSlug: templateRow.slug,
      aspectRatio,
      duration,
      model,
      isStaffGeneration: isStaff,
      // Pass raw inputs for the generate hook to route correctly
      startFrame:   uploadedInputs.startFrame  ? null : undefined, // already uploaded
      endFrame:     uploadedInputs.endFrame    ? null : undefined,
      imageFrames:  uploadedInputs.imageFrames ? null : undefined,
      _uploadedInputs: uploadedInputs,
    })

    if (result) {
      navigate(`/result/${result.generationId}`, {
        state: { outputUrl: result.outputUrl, outputType: result.outputType },
      })
    }
  }

  return (
    <div className="flex flex-col">
      {/* Instructions banner */}
      {def.instructions && (
        <div
          className="mx-4 mt-4 p-4 rounded-2xl mb-5"
          style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)' }}
        >
          <div className="flex items-start gap-2">
            <Info size={14} style={{ color: 'var(--brand)', flexShrink: 0, marginTop: 2 }} />
            <p
              className="text-xs leading-relaxed whitespace-pre-line"
              style={{ color: 'var(--text-secondary)' }}
            >
              {def.instructions}
            </p>
          </div>
        </div>
      )}

      <div className="px-4 pb-32">
        {/* Input fields */}
        {def.inputs.map((field) => {
          if (field.type === 'image') {
            return (
              <div key={field.key} className="mb-5">
                <ImageUpload
                  sublabel={field.label}
                  value={inputs[field.key] || null}
                  onChange={(file) => setInput(field.key, file)}
                  onRemove={() => setInput(field.key, null)}
                />
                {field.hint && (
                  <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>{field.hint}</p>
                )}
              </div>
            )
          }

          if (field.type === 'multi_image') {
            return (
              <div key={field.key} className="mb-5">
                <MultiImageUpload
                  values={inputs[field.key] || []}
                  onChange={(files) => setInput(field.key, files)}
                  minImages={field.minCount || 3}
                  maxImages={field.maxCount || 20}
                />
              </div>
            )
          }

          return null
        })}

        {/* Settings toggle */}
        {(def.supportsAspect || def.supportsDuration || def.supportsModel) && (
          <>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 w-full py-3 px-4 rounded-2xl mb-2 transition-colors"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
            >
              <span className="text-sm font-semibold flex-1 text-left" style={{ fontFamily: 'Syne, sans-serif' }}>
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
                    {def.supportsAspect && (
                      <SettingChips
                        label="Aspect Ratio"
                        options={[
                          { label: '9:16 Portrait',  value: '9:16'  },
                          { label: '16:9 Landscape', value: '16:9'  },
                          { label: '1:1 Square',     value: '1:1'   },
                        ]}
                        value={aspectRatio}
                        onChange={setAspectRatio}
                      />
                    )}
                    {def.supportsDuration && (
                      <SettingChips
                        label="Duration"
                        options={[
                          { label: '5s', value: '5'  },
                          { label: '8s', value: '8'  },
                          { label: '10s', value: '10' },
                        ]}
                        value={duration}
                        onChange={setDuration}
                      />
                    )}
                    {def.supportsModel && (
                      <SettingChips
                        label="AI Model"
                        options={[
                          { label: 'Kling 2.5',  value: 'kling_2_5'    },
                          { label: 'Seedance',   value: 'seedance_1_5' },
                        ]}
                        value={model}
                        onChange={setModel}
                      />
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Loading overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
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
            {isStaff
              ? 'Generate (Free)'
              : `Generate · ${estimatedCredits} credits`}
          </Button>
          {!canAfford && !isStaff && (
            <p className="text-xs text-center mt-2 text-red-500">
              Not enough credits.{' '}
              <button onClick={() => navigate('/profile')} className="underline font-semibold">
                Top up here
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
