// api/generate.js
import { fal } from '@fal-ai/client'

fal.config({ credentials: process.env.FAL_KEY })

const WAVESPEED_KEY = process.env.WAVESPEED_KEY

// ── Model registry ─────────────────────────────────────────

const MODELS = {
  fal: {
    kling_2_5:        'fal-ai/kling-video/v2.5/pro/image-to-video',
    kling_2_5_t2v:    'fal-ai/kling-video/v2.5/pro/text-to-video',
    kling_3_0:        'fal-ai/kling-video/v3.0/pro/image-to-video',
    seedance_1_5:     'fal-ai/seedance-1-5-pro',
    seedance_2_0:     'fal-ai/seedance-2.0',
    imagen_3:         'fal-ai/imagen3',
    imagen_3_fast:    'fal-ai/imagen3/fast',
    flux_i2i:         'fal-ai/flux/dev/image-to-image',
  },
  wavespeed: {
    kling_2_5:        'kling-v2.6-pro/image-to-video',
    kling_2_5_t2v:    'kling-v2.6-pro/text-to-video',
    kling_3_0:        'kling-v3.0-pro/image-to-video',
    seedance_1_5:     'seedance-v1.5-pro/image-to-video',
    seedance_2_0:     'seedance-2.0/image-to-video',
    imagen_3:         'google/nano-banana-pro/text-to-image',
    imagen_3_fast:    'google/nano-banana-2/text-to-image',
    flux_i2i:         'flux-kontext-dev/multi',
  },
}

// ── Provider runners ───────────────────────────────────────

const runFal = async (modelKey, input) => {
  const endpoint = MODELS.fal[modelKey]
  if (!endpoint) throw new Error(`Unknown fal model: ${modelKey}`)
  return fal.subscribe(endpoint, { input, pollInterval: 3000 })
}

const runWavespeed = async (modelKey, input) => {
  const model = MODELS.wavespeed[modelKey]
  if (!model) throw new Error(`Unknown wavespeed model: ${modelKey}`)

  const response = await fetch(`https://api.wavespeed.ai/api/v3/predictions`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${WAVESPEED_KEY}`,
    },
    body: JSON.stringify({ model, input }),
  })

  if (!response.ok) throw new Error(`WaveSpeed error: ${response.status}`)

  const { id } = await response.json()

  // Poll for result
  return pollWavespeed(id)
}

const pollWavespeed = async (predictionId, maxAttempts = 120) => {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 3000))

    const res  = await fetch(`https://api.wavespeed.ai/api/v3/predictions/${predictionId}`, {
      headers: { 'Authorization': `Bearer ${WAVESPEED_KEY}` },
    })
    const data = await res.json()

    if (data.status === 'completed') return data.output
    if (data.status === 'failed')    throw new Error(data.error || 'WaveSpeed generation failed')
  }

  throw new Error('WaveSpeed generation timed out')
}

// ── Active provider from Supabase settings ─────────────────

const { createClient } = await import('@supabase/supabase-js')

const getSettings = async () => {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['active_provider', 'model_kling', 'model_seedance', 'model_image'])

  return Object.fromEntries((data || []).map((r) => [r.key, JSON.parse(r.value)]))
}

// ── Unified runner with fallback ───────────────────────────

const runModel = async (modelKey, input, provider) => {
  try {
    if (provider === 'wavespeed') return await runWavespeed(modelKey, input)
    return await runFal(modelKey, input)
  } catch (err) {
    console.warn(`[${provider}] failed, trying fallback:`, err.message)
    // Fallback to the other provider
    if (provider === 'wavespeed') return await runFal(modelKey, input)
    return await runWavespeed(modelKey, input)
  }
}

// ── Output normalizers ─────────────────────────────────────
// fal and wavespeed return different shapes — normalize here

const getImageUrl = (result, provider) => {
  if (provider === 'fal') return result.images?.[0]?.url
  return result?.images?.[0] || result?.url || null
}

const getVideoUrl = (result, provider) => {
  if (provider === 'fal') return result.video?.url
  return result?.video?.url || result?.url || null
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
    return { outputUrl: getImageUrl(result, provider), outputType: 'image' }
  },

  image_to_image: async ({ prompt, imageUrl, strength = 0.8 }) => {
    const result = await runModel('flux_i2i', {
      prompt,
      image_url:           imageUrl,
      strength,
      num_inference_steps: 28,
      num_images:          1,
    }, provider)
    return { outputUrl: getImageUrl(result, provider), outputType: 'image' }
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
    return { outputUrl: getVideoUrl(result, provider), outputType: 'video' }
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
    return { outputUrl: getVideoUrl(result, provider), outputType: 'video' }
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
    return { outputUrl: getVideoUrl(result, provider), outputType: 'video' }
  },

  end_frame_text: async ({ prompt, endFrameUrl, aspectRatio, duration }) => {
    const result = await runModel('kling_2_5', {
      prompt,
      tail_image_url: endFrameUrl,
      aspect_ratio:   aspectRatio,
      duration:       parseInt(duration),
    }, provider)
    return { outputUrl: getVideoUrl(result, provider), outputType: 'video' }
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
    return { outputUrl: getVideoUrl(result, provider), outputType: 'video' }
  },

  template_memory_lane: async ({ imageUrls, aspectRatio, duration, templatePrompt }) => {
    const result = await runModel('kling_2_5', {
      prompt:         templatePrompt,
      image_url:      imageUrls[0],
      tail_image_url: imageUrls[imageUrls.length - 1],
      aspect_ratio:   aspectRatio,
      duration:       Math.min(parseInt(duration) * imageUrls.length, 15),
    }, provider)
    return { outputUrl: getVideoUrl(result, provider), outputType: 'video' }
  },
})

// ── Main handler ───────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { action, ...payload } = req.body

  try {
    const settings  = await getSettings()
    const provider  = settings.active_provider || 'fal'
    const handlers  = buildHandlers(settings, provider)

    if (!handlers[action]) {
      return res.status(400).json({ error: `Unknown action: ${action}` })
    }

    const result = await handlers[action](payload)

    if (!result?.outputUrl) throw new Error('Generation returned no output URL')

    return res.status(200).json({ ...result, provider })
  } catch (error) {
    console.error(`Generation error [${action}]:`, error.message)
    return res.status(500).json({ error: error.message || 'Generation failed' })
  }
}
