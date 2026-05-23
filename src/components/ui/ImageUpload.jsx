// src/components/ui/ImageUpload.jsx
import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, ImageIcon, Plus } from 'lucide-react'

// Single image upload
export const ImageUpload = ({
  label,
  sublabel,
  value,      // File object or URL
  onChange,   // (file) => void
  onRemove,
  accept = 'image/*',
  maxSizeMb = 10,
  className = '',
}) => {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState(null)

  const preview = value ? (typeof value === 'string' ? value : URL.createObjectURL(value)) : null

  const handleFile = (file) => {
    setError(null)
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`Image must be under ${maxSizeMb}MB`)
      return
    }

    onChange(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </p>
      )}

      <AnimatePresence mode="wait">
        {preview ? (
          // Preview state
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative rounded-2xl overflow-hidden aspect-[9/16] max-h-64 w-full"
          >
            <img
              src={preview}
              alt="Upload preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <button
              onClick={onRemove}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
            >
              <X size={14} />
            </button>
            {sublabel && (
              <div className="absolute bottom-2 left-3 right-3">
                <p className="text-white text-xs font-medium">{sublabel}</p>
              </div>
            )}
          </motion.div>
        ) : (
          // Upload state
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className="relative rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 aspect-[9/16] max-h-64 flex flex-col items-center justify-center gap-3"
            style={{
              borderColor: dragOver ? 'var(--brand)' : 'var(--border)',
              background: dragOver ? 'rgba(249,115,22,0.05)' : 'var(--bg-input)',
            }}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--bg-elevated)' }}>
              <Upload size={20} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div className="text-center px-4">
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {sublabel || 'Upload image'}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Tap to browse · Max {maxSizeMb}MB
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
      />
    </div>
  )
}

// Multiple image upload (Memory Lane)
export const MultiImageUpload = ({
  values = [],
  onChange,
  maxImages = 20,
  minImages = 3,
  className = '',
}) => {
  const inputRef = useRef(null)
  const [error, setError] = useState(null)

  const handleFiles = (files) => {
    setError(null)
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'))

    if (values.length + newFiles.length > maxImages) {
      setError(`Maximum ${maxImages} images allowed`)
      return
    }

    onChange([...values, ...newFiles])
  }

  const removeImage = (index) => {
    onChange(values.filter((_, i) => i !== index))
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Photos ({values.length}/{maxImages})
        </p>
        {values.length < minImages && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Minimum {minImages} photos
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {/* Existing images */}
        {values.map((file, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative aspect-square rounded-xl overflow-hidden"
          >
            <img
              src={URL.createObjectURL(file)}
              alt={`Photo ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => removeImage(index)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center text-white"
            >
              <X size={10} />
            </button>
            <div className="absolute bottom-1 left-1 bg-black/50 rounded px-1">
              <span className="text-white text-xs">{index + 1}</span>
            </div>
          </motion.div>
        ))}

        {/* Add more button */}
        {values.length < maxImages && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer transition-all"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-input)' }}
          >
            <Plus size={20} style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Add</span>
          </motion.button>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  )
}
