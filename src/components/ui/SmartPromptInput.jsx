// src/components/ui/SmartPromptInput.jsx
import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ImagePlus, X, Loader2, ArrowRight,
         Film, Image, Layers, Wand2, AlertCircle } from 'lucide-react'
import { useUnderstandPrompt } from '@/hooks/useUnderstandPrompt'

// ─── Type display config ───────────────────────────────────

const TYPE_CONFIG = {
  text_to_image:    { label: 'Image',            icon: Image,   color: '#8b5cf6' },
  image_to_image:   { label: 'Image remix',       icon: Wand2,   color: '#06b6d4' },
  text_to_video:    { label: 'Video',             icon: Film,    color: '#f97316' },
  image_to_video:   { label: 'Animate image',     icon: Film,    color: '#10b981' },
  start_end_frame:  { label: 'Frame to frame',    icon: Layers,  color: '#f43f5e' },
  end_frame_text:   { label: 'End frame video',   icon: Film,    color: '#eab308' },
  template:         { label: 'Template',          icon: Sparkles,color: '#f97316' },
}

// ─── Understanding Result Card ─────────────────────────────

const UnderstandingCard = ({ data, onConfirm, onReset }) => {
  const config  = TYPE_CONFIG[data.type] || TYPE_CONFIG.text_to_video
  const Icon    = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}
    >
      {/* Type pill */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: `${config.color}20` }}
          >
            <Icon size={14} style={{ color: config.color }} />
          </div>
          <span
            className="text-sm font-bold"
            style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}
          >
            {config.label}
          </span>
          {data.templateSlug && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(249,115,22,0.1)', color: 'var(--brand)' }}
            >
              {data.templateSlug}
            </span>
          )}
        </div>

        {/* Confidence indicator */}
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: data.confidence > 0.8 ? '#10b981'
                        : data.confidence > 0.6 ? '#eab308'
                        : '#ef4444'
            }}
          />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {Math.round(data.confidence * 100)}% match
          </span>
        </div>
      </div>

      {/* AI message */}
      <div className="px-4 py-3">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {data.user_message}
        </p>
      </div>

      {/* Enhanced prompt preview */}
      <div
        className="mx-4 mb-3 p-3 rounded-xl"
        style={{ background: 'var(--bg-elevated)' }}
      >
        <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
          ENHANCED PROMPT
        </p>
        <p
          className="text-xs leading-relaxed"
          style={{ color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}
        >
          {data.enhanced_prompt}
        </p>
      </div>

      {/* Settings row */}
      <div className="flex items-center gap-3 px-4 pb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>⏱ {data.duration}s</span>
        <span>·</span>
        <span>📐 {data.aspect_ratio}</span>
        <span>·</span>
        <span>🤖 {data.model?.replace(/_/g, ' ')}</span>
        {data.requires_images > 0 && (
          <>
            <span>·</span>
            <span style={{ color: '#eab308' }}>
              📸 {data.requires_images === 'multiple' ? 'Multiple images needed' : `${data.requires_images} image needed`}
            </span>
          </>
        )}
      </div>

      {/* Actions */}
      <div
        className="flex gap-2 px-4 pb-4"
        style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}
      >
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
        >
          <X size={14} /> Try again
        </button>
        <button
          onClick={() => onConfirm(data)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
          style={{ background: 'var(--brand)', color: 'white', fontFamily: 'Syne, sans-serif' }}
        >
          <ArrowRight size={14} />
          {data.requires_images > 0 ? 'Continue — upload images' : 'Generate now'}
        </button>
      </div>
    </motion.div>
  )
}

// ─── Smart Prompt Input ────────────────────────────────────

export const SmartPromptInput = ({ onConfirm }) => {
  const [prompt,      setPrompt]      = useState('')
  const [images,      setImages]      = useState([])
  const [dragOver,    setDragOver]    = useState(false)
  const inputRef                      = useRef(null)
  const fileRef                       = useRef(null)

  const { understand, understanding, loading, error, reset } = useUnderstandPrompt()

  const handleUnderstand = async () => {
    if (!prompt.trim()) return
    await understand(prompt, {
      hasImages:  images.length > 0,
      imageCount: images.length,
    })
  }

  const handleConfirm = (data) => {
    onConfirm({
      ...data,
      uploadedImages: images,
    })
  }

  const handleReset = () => {
    reset()
    setPrompt('')
    setImages([])
  }

  const addImages = (files) => {
    const valid = Array.from(files).filter((f) => f.type.startsWith('image/'))
    setImages((prev) => [...prev, ...valid].slice(0, 10))
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    addImages(e.dataTransfer.files)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && prompt.trim() && !loading) {
      e.preventDefault()
      handleUnderstand()
    }
  }

  // If understanding is ready, show the result card
  if (understanding) {
    return <UnderstandingCard data={understanding} onConfirm={handleConfirm} onReset={handleReset} />
  }

  return (
    <div className="flex flex-col gap-3">

      {/* Image previews */}
      <AnimatePresence>
        {images.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-2 overflow-x-auto no-scrollbar pb-1"
          >
            {images.map((img, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden"
              >
                <img
                  src={URL.createObjectURL(img)}
                  alt={`Upload ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 flex items-center justify-center"
                >
                  <X size={8} className="text-white" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div
        className="rounded-2xl overflow-hidden transition-all"
        style={{
          border:     `1.5px solid ${dragOver ? 'var(--brand)' : 'var(--border)'}`,
          background: dragOver ? 'rgba(249,115,22,0.03)' : 'var(--bg-card)',
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <textarea
          ref={inputRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what you want to create... e.g. 'A cinematic video of Lagos at sunset' or 'Office handover between two colleagues'"
          rows={3}
          className="w-full px-4 pt-4 pb-2 resize-none outline-none text-sm leading-relaxed"
          style={{
            background:  'transparent',
            color:       'var(--text-primary)',
            fontFamily:  'DM Sans, sans-serif',
          }}
        />

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          <div className="flex items-center gap-2">
            {/* Image attach */}
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors"
              style={{
                background: images.length > 0 ? 'rgba(249,115,22,0.1)' : 'var(--bg-elevated)',
                color:      images.length > 0 ? 'var(--brand)' : 'var(--text-muted)',
              }}
            >
              <ImagePlus size={13} />
              {images.length > 0 ? `${images.length} image${images.length > 1 ? 's' : ''}` : 'Add images'}
            </button>

            {/* Hint */}
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              or drag &amp; drop
            </span>
          </div>

          {/* Understand button */}
          <button
            onClick={handleUnderstand}
            disabled={!prompt.trim() || loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
            style={{
              background: 'var(--brand)',
              color:      'white',
              fontFamily: 'Syne, sans-serif',
            }}
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            {loading ? 'Thinking…' : 'Create'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
          style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}
        >
          <AlertCircle size={12} />
          {error}
        </div>
      )}

      {/* Hint chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {[
          'Cinematic Lagos sunset video',
          'Office handover scene',
          'Memory lane slideshow',
          'Animate my photo',
        ].map((hint) => (
          <button
            key={hint}
            onClick={() => setPrompt(hint)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={{
              background: 'var(--bg-elevated)',
              color:      'var(--text-muted)',
              border:     '1px solid var(--border)',
            }}
          >
            {hint}
          </button>
        ))}
      </div>
    </div>
  )
}
