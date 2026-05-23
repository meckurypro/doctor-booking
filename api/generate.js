// api/generate.js
// ============================================================
// Unified AI generation proxy — fal.ai + WaveSpeed
// Provider is read from Supabase app_settings at runtime.
// API keys never touch the client bundle.
// ============================================================

import { fal }          from '@fal-ai/client'
import { createClient } from '@supabase/supabase-js'

fal.config({ credentials: process.env.FAL_KEY })

const WAVESPEED_KEY = process.env.WAVESPEED_KEY

// ── Model registry ─────────────────────────────────────────

const MODELS = {
  fal: {
    kling_2_5:     'fal-ai/kling-video/v2.5/pro/image-to-video',
    kling_2_5_t2v: 'fal-ai/kling-video/v2.5/pro/text-to-video',
    kling_3_0:     'fal-ai/kling-video/v3.0/pro/image-to-video',
    seedance_1_5:  'fal-ai/seedance-1-5-pro',
    seedance_2_0:  'fal-ai/seedance-2.0',
    imagen_3:      'fal-ai/imagen3',
    imagen_3_fast: 'fal-ai/imagen3/fast',
    flux_i2i:      'fal-ai/flux/dev/image-to-image',
  },
  wavespeed: {
    kling_2_5:     'wavespeed-ai/kling-v2.6-pro/image-to-video',
    kling_2_5_t2v: 'wavespeed-ai/kling-v2.6-pro/text-to-video',
    kling_3_0:     'wavespeed-ai/kling-v3.0-pro/image-to-video',
    seedance_1_5:  'wavespeed-ai/seedance-v1.5-pro/image-to-video',
    seedance_2_0:  'bytedance/seedance-2.0/image-to-video',
    imagen_3:      'wavespeed-ai/google/nano-banana-pro/text-to-image',
    imagen_3_fast: 'wavespeed-ai/google/nano-banana-2/text-to-image',
    flux_i2i:      'wavespeed-ai/flux-kontext-dev/multi',
  },
}

// ── fal.ai runner ──────────────────────────────────────────

const runFal = async (modelKey, input) => {
  const endpoint = MODELS.fal[modelKey]
  if (!endpoint) throw new Error(`Unknown fal model: ${modelKey}`)
  const result = await fal.subscribe(endpoint, { input, pollInterval: 3000 })
  return { raw: result, provider: 'fal' }
}

// ── WaveSpeed runner ───────────────────────────────────────

const runWavespeed = async (modelKey, input) => {
  const model = MODELS.wavespeed[modelKey]
  if (!model) throw new Error(`Unknown wavespeed model: ${modelKey}`)

  const response = await fetch('https://api.wavespeed.ai/api/v3/predictions', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${WAVESPEED_KEY}`,
    },
    body: JSON.stringify({ model, input }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => response.status)
    throw new Error(`WaveSpeed submit error ${response.status}: ${errText}`)
  }

  const submission = await response.json()
  const predictionId = submission?.data?.id || submission?.id

  if (!predictionId) throw new Error('WaveSpeed returned no prediction ID')

  const raw = await pollWavespeed(predictionId)
  return { raw, provider: 'wavespeed' }
}

const pollWavespeed = async (predictionId, maxAttempts = 120) => {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 3000))

    const res  = await fetch(`https://api.wavespeed.ai/api/v3/predictions/${predictionId}`, {
      headers: { 'Authorization': `Bearer ${WAVESPEED_KEY}` },
    })

    if (!res.ok) throw new Error(`WaveSpeed poll error ${res.status}`)

    const data = await res.json()
    // WaveSpeed wraps response in data envelope
    const prediction = data?.data || data

    console.log(`[WaveSpeed poll ${i + 1}] status: ${prediction.status}`)

    if (prediction.status === 'completed') return prediction
    if (prediction.status === 'failed')    throw new Error(prediction.error || 'WaveSpeed generation failed')
    // 'processing' | 'queued' → keep polling
  }

  throw new Error('WaveSpeed generation timed out after 6 minutes')
}

// ── Unified runner with fallback ───────────────────────────

const runModel = async (modelKey, input, provider) => {
  try {
    if (provider === 'wavespeed') return await runWavespeed(modelKey, input)
    return await runFal(modelKey, input)
  } catch (err) {
    const fallback = provider === 'wavespeed' ? 'fal' : 'wavespeed'
    console.warn(`[${provider}] failed (${err.message}), falling back to ${fallback}`)
    if (fallback === 'fal') return await runFal(modelKey, input)
    return await runWavespeed(modelKey, input)
  }
}

// ── Output normalizers ─────────────────────────────────────
// fal and WaveSpeed return different shapes — normalize to { outputUrl, outputType }

const extractImageUrl = ({ raw, provider }) => {
  if (provider === 'fal') {
    return raw?.images?.[0]?.url || raw?.image?.url || null
  }
  // WaveSpeed: outputs is array of URLs or objects
  const outputs = raw?.outputs
  if (!outputs) return null
  if (Array.isArray(outputs)) {
    const first = outputs[0]
    return typeof first === 'string' ? first : first?.url || null
  }
  return outputs?.url || null
}

const extractVideoUrl = ({ raw, provider }) => {
  if (provider === 'fal') {
    return raw?.video?.url || raw?.videos?.[0]?.url || null
  }
  // WaveSpeed
  const outputs = raw?.outputs
  if (!outputs) return null
  if (Array.isArray(outputs)) {
    const first = outputs[0]
    return typeof first === 'string' ? first : first?.url || null
  }
  return outputs?.url || null
}

// ── Supabase settings loader ───────────────────────────────

const getSettings = async () => {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['active_provider', 'model_kling', 'model_seedance', 'model_image'])

  if (error) {
    console.warn('Could not load app_settings, using defaults:', error.message)
    return {}
  }

  return Object.fromEntries((data || []).map((r) => {
    try   { return [r.key, JSON.parse(r.value)] }
    catch { return [r.key, r.value] }
  }))
}

// ── Action handlers ────────────────────────────────────────

const buildHandlers = (settings, provider) => ({

  text_to_image: async ({ prompt, aspectRatio }) => {
    const modelKey = settings.model_image || 'imagen_3_fast'
    const result   = await runModel(modelKey, {
      prompt,
      aspect_ratio:        aspectRatio,
      num_images:          1,
      safety_filter_level: 'block_medium_and_above',
    }, provider)
    return { outputUrl: extractImageUrl(result), outputType: 'image', provider: result.provider }
  },

  image_to_image: async ({ prompt, imageUrl, strength = 0.8 }) => {
    const result = await runModel('flux_i2i', {
      prompt,
      image_url:           imageUrl,
      strength,
      num_inference_steps: 28,
      num_images:          1,
    }, provider)
    return { outputUrl: extractImageUrl(result), outputType: 'image', provider: result.provider }
  },

  text_to_video: async ({ prompt, aspectRatio, duration, model }) => {
    const modelKey = model === 'seedance_2_0' ? 'seedance_2_0'
                   : model === 'seedance_1_5' ? 'seedance_1_5'
                   : model === 'kling_3_0'    ? 'kling_3_0'
                   : 'kling_2_5_t2v'
    const result   = await runModel(modelKey, {
      prompt,
      aspect_ratio: aspectRatio,
      duration:     parseInt(duration),
    }, provider)
    return { outputUrl: extractVideoUrl(result), outputType: 'video', provider: result.provider }
  },

  image_to_video: async ({ prompt, imageUrl, aspectRatio, duration, model }) => {
    const modelKey = model === 'seedance_2_0' ? 'seedance_2_0'
                   : model === 'seedance_1_5' ? 'seedance_1_5'
                   : model === 'kling_3_0'    ? 'kling_3_0'
                   : 'kling_2_5'
    const result   = await runModel(modelKey, {
      prompt,
      image_url:    imageUrl,
      aspect_ratio: aspectRatio,
      duration:     parseInt(duration),
    }, provider)
    return { outputUrl: extractVideoUrl(result), outputType: 'video', provider: result.provider }
  },

  start_end_frame: async ({ prompt, startFrameUrl, endFrameUrl, aspectRatio, duration, model }) => {
    const modelKey = model === 'kling_3_0' ? 'kling_3_0' : 'kling_2_5'
    const result   = await runModel(modelKey, {
      prompt,
      image_url:      startFrameUrl,
      tail_image_url: endFrameUrl,
      aspect_ratio:   aspectRatio,
      duration:       parseInt(duration),
    }, provider)
    return { outputUrl: extractVideoUrl(result), outputType: 'video', provider: result.provider }
  },

  end_frame_text: async ({ prompt, endFrameUrl, aspectRatio, duration }) => {
    const result = await runModel('kling_2_5', {
      prompt,
      tail_image_url: endFrameUrl,
      aspect_ratio:   aspectRatio,
      duration:       parseInt(duration),
    }, provider)
    return { outputUrl: extractVideoUrl(result), outputType: 'video', provider: result.provider }
  },

  template_office_handover: async ({ startFrameUrl, endFrameUrl, aspectRatio, duration, model, templatePrompt }) => {
    const modelKey = model === 'kling_3_0' ? 'kling_3_0' : 'kling_2_5'
    const result   = await runModel(modelKey, {
      prompt:         templatePrompt,
      image_url:      startFrameUrl,
      tail_image_url: endFrameUrl,
      aspect_ratio:   aspectRatio,
      duration:       parseInt(duration),
    }, provider)
    return { outputUrl: extractVideoUrl(result), outputType: 'video', provider: result.provider }
  },

  template_memory_lane: async ({ imageUrls, aspectRatio, duration, templatePrompt }) => {
    const result = await runModel('kling_2_5', {
      prompt:         templatePrompt,
      image_url:      imageUrls[0],
      tail_image_url: imageUrls[imageUrls.length - 1],
      aspect_ratio:   aspectRatio,
      duration:       Math.min(parseInt(duration) * imageUrls.length, 15),
    }, provider)
    return { outputUrl: extractVideoUrl(result), outputType: 'video', provider: result.provider }
  },
})

// ── Main handler ───────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { action, ...payload } = req.body

  if (!action) {
    return res.status(400).json({ error: 'Missing action' })
  }

  try {
    const settings = await getSettings()
    const provider = settings.active_provider || 'fal'
    const handlers = buildHandlers(settings, provider)

    if (!handlers[action]) {
      return res.status(400).json({ error: `Unknown action: ${action}` })
    }

    const result = await handlers[action](payload)

    if (!result?.outputUrl) {
      throw new Error(`Generation succeeded but returned no output URL (provider: ${result?.provider || provider})`)
    }

    return res.status(200).json(result)

  } catch (error) {
    console.error(`[generate] action=${action} error:`, error.message)
    return res.status(500).json({ error: error.message || 'Generation failed' })
  }
}
