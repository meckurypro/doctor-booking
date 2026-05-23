// api/upload.js
// Proxies file uploads to fal.ai storage.
// FAL_KEY never reaches the client.

import { IncomingForm } from 'formidable'
import { createReadStream } from 'fs'
import { fal } from '@fal-ai/client'

export const config = { api: { bodyParser: false } }

fal.config({ credentials: process.env.FAL_KEY })

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const form = new IncomingForm({ maxFileSize: 20 * 1024 * 1024 }) // 20MB

    const { files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, _fields, files) => {
        if (err) reject(err)
        else resolve({ files })
      })
    })

    const file = Array.isArray(files.file) ? files.file[0] : files.file
    if (!file) return res.status(400).json({ error: 'No file provided' })

    const stream = createReadStream(file.filepath)
    const blob   = new Blob([await streamToBuffer(stream)], { type: file.mimetype })
    const url    = await fal.storage.upload(blob)

    return res.status(200).json({ url })
  } catch (error) {
    console.error('Upload error:', error.message)
    return res.status(500).json({ error: 'Upload failed' })
  }
}

const streamToBuffer = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = []
    stream.on('data',  (chunk) => chunks.push(chunk))
    stream.on('end',   () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
