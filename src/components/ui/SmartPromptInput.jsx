import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Send, Upload, X, Loader2, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

// ============================================================
// SMART PROMPT INPUT
// Claude reads the user's description and resolves:
//   - generation type (text_to_image, start_end_frame, etc.)
//   - aspect ratio
//   - duration
//   - model
//   - enhanced prompt
//   - whether a template should be used
// ============================================================

const SYSTEM_PROMPT = `You are an AI content creation assistant for Meckury, an AI video and image generation platform.

The user will describe what they want to create in plain language.
Your job is to resolve the BEST generation type, settings, and an enhanced prompt.

Generation types available:
- text_to_image: user wants a static image from words
- image_to_image: user wants to transform an uploaded image
- text_to_video: user wants a video from words only (no images)
- image_to_video: user wants to animate one uploaded image
- start_end_frame: user wants a video between two uploaded images
- end_frame_text: user wants a video that ends on an uploaded image
- template:office-handover: user wants a leadership/handover transition video
- template:memory-lane: user wants a photo journey / memory video

Rules:
1. If user mentions "transition", "handover", "step down", "take over" → template:office-handover
2. If user mentions "memory", "photos", "journey", "slideshow", "life" → template:memory-lane
3. If user uploads or mentions 2 images → start_end_frame
4. If user uploads or mentions 1 image → image_to_video
5. For Nigerian/African leaders, politicians, pastors → start_end_frame is usually best
6. Default video aspect to 9:16 (portrait/TikTok)
7. Default duration to 5s unless user says longer

Respond ONLY with valid JSON. No explanation. No markdown.

{
  "type": "start_end_frame",
  "templateSlug": null,
  "enhanced_prompt": "...",
  "aspect_ratio": "9:16",
  "duration": "5",
  "model": "kling_2_5",
  "reasoning": "One sentence explaining the choice"
}`

// ── Suggestion chips ──────────────────────────────────────

const SUGGESTIONS = [
  { label: '🎬 Office Handover',   text: 'Create a cinematic office handover transition between two leaders'          },
  { label: '📸 Memory Lane',       text: 'Turn my photos into a beautiful memory lane video'                          },
  { label: '🇳🇬 Nigerian Leaders', text: 'Create a transition video of Nigerian leaders from 1960 to present'        },
  { label: '🎵 Dancing video',     text: 'Make a fun dancing video from my photo'                                     },
  { label: '🖼 AI Portrait',       text: 'Generate a cinematic AI portrait of a Nigerian businessman in a modern office' },
]

// ============================================================

export const SmartPromptInput = ({ onConfirm }) => {
  const [prompt,        setPrompt]        = useState('')
  const [thinking,      setThinking]      = useState(false)
  const [resolution,    setResolution]    = useState(null) // AI response
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [showReasoning, setShowReasoning] = useState(false)
  const fileInputRef = useRef(null)

  const anthropicKey = import.meta.env.VITE_ANTHROPIC_KEY

  // ── Call Claude ─────────────────────────────────────────
  const resolve = async () => {
    if (!prompt.trim()) {
      toast.error('Tell me what you want to create')
      return
    }

    setThinking(true)
    setResolution(null)

    try {
      const userMessage = uploadedFiles.length > 0
        ? `${prompt}\n\n(User has uploaded ${uploadedFiles.length} image${uploadedFiles.length > 1 ? 's' : ''})`
        : prompt

      let resolved

      if (anthropicKey) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method:  'POST',
          headers: {
            'Content-Type':    'application/json',
            'x-api-key':       anthropicKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model:      'claude-sonnet-4-20250514',
            max_tokens: 500,
            system:     SYSTEM_PROMPT,
            messages:   [{ role: 'user', content: userMessage }],
          }),
        })

        const data = await response.json()
        const text = data.content?.[0]?.text?.trim() || ''

        // Strip any accidental markdown fences
        const clean = text.replace(/```json|```/g, '').trim()
        resolved = JSON.parse(clean)
      } else {
        // Fallback: basic heuristic resolution without API key
        const lower = prompt.toLowerCase()
        resolved = {
          type:             lower.includes('image') ? 'text_to_image' : 'text_to_video',
          templateSlug:     null,
          enhanced_prompt:  prompt,
          aspect_ratio:     '9:16',
          duration:         '5',
          model:            'kling_2_5',
          reasoning:        'API key not configured — using basic heuristic.',
        }
      }

      // Attach uploaded files
      resolved.uploadedImages = uploadedFiles

      setResolution(resolved)
    } catch (err) {
      console.error('Smart resolve failed:', err)
      toast.error('Could not analyse your prompt. Try again.')
    } finally {
      setThinking(false)
    }
  }

  // ── Handle file upload ───────────────────────────────────
  const handleFiles = (files) => {
    const valid = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (valid.length === 0) return
    if (uploadedFiles.length + valid.length > 2) {
      toast.error('Maximum 2 images for Smart Create')
      return
    }
    setUploadedFiles((prev) => [...prev, ...valid].slice(0, 2))
    setResolution(null) // reset on new file
  }

  const removeFile = (index) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
    setResolution(null)
  }

  const handleConfirm = () => {
    if (!resolution) return
    onConfirm(resolution)
  }

  const handleSuggestion = (text) => {
    setPrompt(text)
    setResolution(null)
  }

  const isTemplate = resolution?.templateSlug != null
  const typeLabel = {
    text_to_image:   'Text → Image',
    image_to_image:  'Image → Image',
    text_to_video:   'Text → Video',
    image_to_video:  'Image → Video',
    start_end_frame: 'Start + End Frame',
    end_frame_text:  'End Frame + Text',
    template:        'Template',
  }[resolution?.type] ?? resolution?.type

  return (
    <div className="flex flex-col gap-4">

      {/* Uploaded images preview */}
      {uploadedFiles.length > 0 && (
        <div className="flex gap-2">
          {uploadedFiles.map((file, i) => (
            <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
              <img
                src={URL.createObjectURL(file)}
                alt={`Upload ${i + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => removeFile(i)}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center text-white"
              >
                <X size={10} />
              </button>
              <div
                className="absolute bottom-0.5 left-0.5 text-white text-xs px-1 rounded font-bold"
                style={{ background: 'rgba(0,0,0,0.6)', fontSize: '9px' }}
              >
                {i === 0 ? 'START' : 'END'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main input box */}
      <div
        className="rounded-3xl overflow-hidden"
        style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)' }}
      >
        <textarea
          value={prompt}
          onChange={(e) => { setPrompt(e.target.value); setResolution(null) }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); resolve() }
          }}
          placeholder="Describe what you want to create… e.g. 'Office handover between Obasanjo and Yar'adua'"
          rows={3}
          className="w-full px-4 pt-4 pb-2 resize-none outline-none text-sm"
          style={{
            background:  'transparent',
            color:       'var(--text-primary)',
            fontFamily:  'DM Sans, sans-serif',
            lineHeight:  '1.6',
          }}
        />

        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          <div className="flex items-center gap-2">
            {/* Upload images */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
            >
              <Upload size={12} />
              {uploadedFiles.length > 0 ? `${uploadedFiles.length} image${uploadedFiles.length > 1 ? 's' : ''}` : 'Add images'}
            </button>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>optional</span>
          </div>

          {/* Analyse button */}
          <button
            onClick={resolve}
            disabled={!prompt.trim() || thinking}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
            style={{ background: 'var(--brand)', color: 'white', fontFamily: 'Syne, sans-serif' }}
          >
            {thinking ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            {thinking ? 'Thinking…' : 'Analyse'}
          </button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Suggestion chips */}
      {!resolution && !thinking && (
        <div className="flex gap-2 flex-wrap">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => handleSuggestion(s.text)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Resolution result */}
      <AnimatePresence>
        {resolution && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-card)', border: '1px solid rgba(249,115,22,0.3)' }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ background: 'rgba(249,115,22,0.06)', borderBottom: '1px solid rgba(249,115,22,0.15)' }}
            >
              <div className="flex items-center gap-2">
                <Sparkles size={14} style={{ color: 'var(--brand)' }} />
                <span className="text-xs font-bold" style={{ color: 'var(--brand)', fontFamily: 'Syne, sans-serif' }}>
                  ✦ AI resolved
                </span>
              </div>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'rgba(249,115,22,0.15)', color: 'var(--brand)' }}
              >
                {isTemplate ? `Template: ${resolution.templateSlug}` : typeLabel}
              </span>
            </div>

            {/* Enhanced prompt preview */}
            <div className="px-4 py-3">
              <p className="text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Enhanced prompt
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                {resolution.enhanced_prompt}
              </p>
            </div>

            {/* Settings row */}
            <div
              className="flex items-center gap-3 px-4 py-2.5"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              {[
                { label: resolution.aspect_ratio },
                { label: `${resolution.duration}s` },
                { label: resolution.model?.replace('_', ' ') },
              ].map((chip, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-1 rounded-lg font-medium"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                >
                  {chip.label}
                </span>
              ))}

              {/* Reasoning toggle */}
              <button
                onClick={() => setShowReasoning(!showReasoning)}
                className="ml-auto flex items-center gap-1 text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                Why?
                <motion.div animate={{ rotate: showReasoning ? 180 : 0 }}>
                  <ChevronDown size={12} />
                </motion.div>
              </button>
            </div>

            {/* Reasoning */}
            <AnimatePresence>
              {showReasoning && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <p
                    className="px-4 py-3 text-xs leading-relaxed"
                    style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}
                  >
                    {resolution.reasoning}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Confirm */}
            <div className="px-4 pb-4 pt-2">
              <button
                onClick={handleConfirm}
                className="w-full py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                style={{ background: 'var(--brand)', color: 'white', fontFamily: 'Syne, sans-serif' }}
              >
                <Send size={15} />
                Continue with this
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
