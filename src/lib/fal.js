// src/lib/fal.js
// fal.ai calls are proxied through /api/generate (Vercel Serverless Function).
// The VITE_FAL_KEY never touches the client bundle.

// ── Proxy caller ───────────────────────────────────────────

const callGenerateAPI = async (action, payload, onProgress) => {
  const response = await fetch('/api/generate', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ action, ...payload }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error || `API error ${response.status}`)
  }

  // Stream progress if supported, otherwise return JSON
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('text/event-stream')) {
    // SSE streaming — parse progress events
    const reader  = response.body.getReader()
    const decoder = new TextDecoder()
    let result    = null

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      const lines = decoder.decode(value).split('\n').filter(Boolean)
      for (const line of lines) {
        if (!line.startsWith('data:')) continue
        const parsed = JSON.parse(line.slice(5).trim())
        if (parsed.done) result = parsed.result
        else onProgress?.(parsed)
      }
    }
    return result
  }

  return response.json()
}

// ── Upload helper ──────────────────────────────────────────
// Uploads via a signed Supabase Storage URL — no fal key needed client-side.
// If you prefer fal storage, proxy this too.

export const uploadImage = async (file) => {
  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/upload', {
      method: 'POST',
      body:   formData,
    })

    if (!response.ok) throw new Error('Upload failed')
    const { url } = await response.json()
    return { url, error: null }
  } catch (error) {
    return { url: null, error: error.message || 'Upload failed' }
  }
}

// ── Generation functions ───────────────────────────────────

export const textToImage = async ({ prompt, aspectRatio = '9:16', model = 'imagen_3_fast', onProgress }) => {
  try {
    const result = await callGenerateAPI('text_to_image', { prompt, aspectRatio, model }, onProgress)
    return { outputUrl: result.outputUrl, outputType: 'image', error: null }
  } catch (error) {
    return { outputUrl: null, outputType: 'image', error: error.message }
  }
}

export const imageToImage = async ({ prompt, imageUrl, strength = 0.8, onProgress }) => {
  try {
    const result = await callGenerateAPI('image_to_image', { prompt, imageUrl, strength }, onProgress)
    return { outputUrl: result.outputUrl, outputType: 'image', error: null }
  } catch (error) {
    return { outputUrl: null, outputType: 'image', error: error.message }
  }
}

export const textToVideo = async ({ prompt, aspectRatio = '9:16', duration = '5', model = 'kling_2_5', onProgress }) => {
  try {
    const result = await callGenerateAPI('text_to_video', { prompt, aspectRatio, duration, model }, onProgress)
    return { outputUrl: result.outputUrl, outputType: 'video', error: null }
  } catch (error) {
    return { outputUrl: null, outputType: 'video', error: error.message }
  }
}

export const imageToVideo = async ({ prompt, imageUrl, aspectRatio = '9:16', duration = '5', model = 'kling_2_5', onProgress }) => {
  try {
    const result = await callGenerateAPI('image_to_video', { prompt, imageUrl, aspectRatio, duration, model }, onProgress)
    return { outputUrl: result.outputUrl, outputType: 'video', error: null }
  } catch (error) {
    return { outputUrl: null, outputType: 'video', error: error.message }
  }
}

export const startEndFrameToVideo = async ({ prompt, startFrameUrl, endFrameUrl, aspectRatio = '9:16', duration = '5', model = 'kling_2_5', onProgress }) => {
  try {
    const result = await callGenerateAPI('start_end_frame', { prompt, startFrameUrl, endFrameUrl, aspectRatio, duration, model }, onProgress)
    return { outputUrl: result.outputUrl, outputType: 'video', error: null }
  } catch (error) {
    return { outputUrl: null, outputType: 'video', error: error.message }
  }
}

export const endFrameToVideo = async ({ prompt, endFrameUrl, aspectRatio = '9:16', duration = '5', onProgress }) => {
  try {
    const result = await callGenerateAPI('end_frame_text', { prompt, endFrameUrl, aspectRatio, duration }, onProgress)
    return { outputUrl: result.outputUrl, outputType: 'video', error: null }
  } catch (error) {
    return { outputUrl: null, outputType: 'video', error: error.message }
  }
}

export const officeHandoverTemplate = async ({ startFrameUrl, endFrameUrl, aspectRatio = '9:16', duration = '5', model = 'kling_2_5', onProgress }) => {
  try {
    const result = await callGenerateAPI('template_office_handover', { startFrameUrl, endFrameUrl, aspectRatio, duration, model }, onProgress)
    return { outputUrl: result.outputUrl, outputType: 'video', error: null }
  } catch (error) {
    return { outputUrl: null, outputType: 'video', error: error.message }
  }
}

export const memoryLaneTemplate = async ({ imageUrls, aspectRatio = '9:16', duration = '5', onProgress }) => {
  try {
    const result = await callGenerateAPI('template_memory_lane', { imageUrls, aspectRatio, duration }, onProgress)
    return { outputUrl: result.outputUrl, outputType: 'video', error: null }
  } catch (error) {
    return { outputUrl: null, outputType: 'video', error: error.message }
  }
}
