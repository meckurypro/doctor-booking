// ============================================================
// api/upload.js — Vercel Serverless Function
// Handles image uploads to Supabase Storage.
// Returns a public URL the client can pass to /api/generate.
//
// POST /api/upload
// Body: multipart/form-data with field "file"
// Returns: { url: string }
// ============================================================

import { createClient }  from '@supabase/supabase-js'
import { IncomingForm }  from 'formidable'
import { readFileSync }  from 'fs'
import { extname }       from 'path'
import { randomUUID }    from 'crypto'

// Disable default body parser — formidable handles multipart
export const config = { api: { bodyParser: false } }

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const BUCKET        = 'generation-uploads'
const MAX_SIZE_MB   = 20
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // ── Parse multipart form ────────────────────────────
    const form = new IncomingForm({
      maxFileSize: MAX_SIZE_MB * 1024 * 1024,
      keepExtensions: true,
    })

    const [, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err)
        else resolve([fields, files])
      })
    })

    const file = Array.isArray(files.file) ? files.file[0] : files.file
    if (!file) return res.status(400).json({ error: 'No file provided' })

    // ── Validate ────────────────────────────────────────
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return res.status(400).json({
        error: `Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_TYPES.join(', ')}`,
      })
    }

    // ── Upload to Supabase Storage ───────────────────────
    const ext      = extname(file.originalFilename || file.filepath || '.jpg')
    const filename = `${randomUUID()}${ext}`
    const buffer   = readFileSync(file.filepath)

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(`uploads/${filename}`, buffer, {
        contentType:  file.mimetype,
        cacheControl: '3600',
        upsert:       false,
      })

    if (error) {
      console.error('[upload] Supabase storage error:', error)
      return res.status(500).json({ error: 'Upload to storage failed' })
    }

    // ── Get public URL ───────────────────────────────────
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(`uploads/${filename}`)

    return res.status(200).json({ url: publicUrl })

  } catch (err) {
    console.error('[upload] Error:', err.message)

    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: `File too large. Maximum ${MAX_SIZE_MB}MB.` })
    }

    return res.status(500).json({ error: err.message || 'Upload failed' })
  }
}
