// api/generate.js
// Vercel Serverless Function — FAL_KEY never reaches the client.
// All fal.ai generation calls are routed through here.

import { fal } from '@fal-ai/client'

fal.config({ credentials: process.env.FAL_KEY })

// ── Model endpoints ────────────────────────────────────────

const MODELS = {
  kling_2_5:        'fal-ai/kling-video/v2.5/pro/image-to-video',
  kling_2_5_t2v:    'fal-ai/kling-video/v2.5/pro/text-to-video',
  seedance_1_5:     'fal-ai/seedance-1-5-pro',
  imagen_3:         'fal-ai/imagen3',
  imagen_3_fast:    'fal-ai/imagen3/fast',
  flux_i2i:         'fal-ai/flux/dev/image-to-image',
}

// ── Shared fal caller ──────────────────────────────────────

const runFal = async (modelKey, input) => {
  const endpoint = MODELS[modelKey]
  if (!endpoint) throw new Error(`Unknown model: ${modelKey}`)

  const result = await fal.subscribe(endpoint, {
    input,
    pollInterval: 3000,
  })

  return result
}

// ── Action handlers ────────────────────────────────────────

const handlers = {
  text_to_image: async ({ prompt, aspectRatio, model }) => {
    const result = await runFal(model === 'imagen_3' ? 'imagen_3' : 'imagen_3_fast', {
      prompt,
      aspect_ratio:        aspectRatio,
      num_images:          1,
      safety_filter_level: 'block_medium_and_above',
    })
    return { outputUrl: result.images?.[0]?.url, outputType: 'image' }
  },

  image_to_image: async ({ prompt, imageUrl, strength = 0.8 }) => {
    const result = await runFal('flux_i2i', {
      prompt,
      image_url:            imageUrl,
      strength,
      num_inference_steps:  28,
      num_images:           1,
    })
    return { outputUrl: result.images?.[0]?.url, outputType: 'image' }
  },

  text_to_video: async ({ prompt, aspectRatio, duration, model }) => {
    const result = await runFal('kling_2_5_t2v', {
      prompt,
      aspect_ratio: aspectRatio,
      duration:     parseInt(duration),
    })
    return { outputUrl: result.video?.url, outputType: 'video' }
  },

  image_to_video: async ({ prompt, imageUrl, aspectRatio, duration, model }) => {
    const modelKey = model === 'seedance_1_5' ? 'seedance_1_5' : 'kling_2_5'
    const result   = await runFal(modelKey, {
      prompt,
      image_url:    imageUrl,
      aspect_ratio: aspectRatio,
      duration:     parseInt(duration),
    })
    return { outputUrl: result.video?.url, outputType: 'video' }
  },

  start_end_frame: async ({ prompt, startFrameUrl, endFrameUrl, aspectRatio, duration, model }) => {
    const modelKey = model === 'seedance_1_5' ? 'seedance_1_5' : 'kling_2_5'
    const result   = await runFal(modelKey, {
      prompt,
      image_url:      startFrameUrl,
      tail_image_url: endFrameUrl,
      aspect_ratio:   aspectRatio,
      duration:       parseInt(duration),
    })
    return { outputUrl: result.video?.url, outputType: 'video' }
  },

  end_frame_text: async ({ prompt, endFrameUrl, aspectRatio, duration }) => {
    const result = await runFal('kling_2_5', {
      prompt,
      tail_image_url: endFrameUrl,
      aspect_ratio:   aspectRatio,
      duration:       parseInt(duration),
    })
    return { outputUrl: result.video?.url, outputType: 'video' }
  },

  template_office_handover: async ({ startFrameUrl, endFrameUrl, aspectRatio, duration, model, templatePrompt }) => {
    const modelKey = model === 'seedance_1_5' ? 'seedance_1_5' : 'kling_2_5'
    const result   = await runFal(modelKey, {
      prompt:         templatePrompt,
      image_url:      startFrameUrl,
      tail_image_url: endFrameUrl,
      aspect_ratio:   aspectRatio,
      duration:       parseInt(duration),
    })
    return { outputUrl: result.video?.url, outputType: 'video' }
  },

  template_memory_lane: async ({ imageUrls, aspectRatio, duration, templatePrompt }) => {
    // MVP: first-to-last frame. Multi-clip stitching is a future enhancement.
    const result = await runFal('kling_2_5', {
      prompt:         templatePrompt,
      image_url:      imageUrls[0],
      tail_image_url: imageUrls[imageUrls.length - 1],
      aspect_ratio:   aspectRatio,
      duration:       Math.min(parseInt(duration) * imageUrls.length, 15),
    })
    return { outputUrl: result.video?.url, outputType: 'video' }
  },
}

// ── Main handler ───────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { action, ...payload } = req.body

  if (!action || !handlers[action]) {
    return res.status(400).json({ error: `Unknown action: ${action}` })
  }

  try {
    const result = await handlers[action](payload)

    if (!result?.outputUrl) {
      throw new Error('Generation returned no output URL')
    }

    return res.status(200).json(result)
  } catch (error) {
    console.error(`Generation error [${action}]:`, error.message)
    return res.status(500).json({ error: error.message || 'Generation failed' })
  }
}
