// ============================================================
// api/generate.js — Vercel Serverless Function
// Unified AI generation proxy — WaveSpeed + fal.ai
// API keys are server-side only. Client never sees them.
//
// POST /api/generate
// Body: { action, provider?, ...params }
// ============================================================

import { createClient } from '@supabase/supabase-js'

// ── Supabase (service role — server only) ─────────────────

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ── Model registry ────────────────────────────────────────

const WS_MODELS = {
  kling_2_5:     'wavespeed-ai/kling-v2.6-pro/image-to-video',
  kling_2_5_t2v: 'wavespeed-ai/kling-v2.6-pro/text-to-video',
  kling_3_0:     'wavespeed-ai/kling-v3.0-pro/image-to-video',
  seedance_1_5:  'wavespeed-ai/seedance-v1.5-pro/image-to-video',
  seedance_2_0:  'bytedance/seedance-2.0/image-to-video',
  imagen_3_fast: 'wavespeed-ai/google/nano-banana-2/text-to-image',
  imagen_3:      'wavespeed-ai/google/nano-banana-pro/text-to-image',
  flux_i2i:      'wavespeed-ai/flux-kontext-dev/multi',
}

const FAL_MODELS = {
  kling_2_5:     'fal-ai/kling-video/v2.5/pro/image-to-video',
  kling_2_5_t2v: 'fal-ai/kling-video/v2.5/pro/text-to-video',
  kling_3_0:     'fal-ai/kling-video/v3.0/pro/image-to-video',
  seedance_1_5:  'fal-ai/seedance-1-5-pro',
  seedance_2_0:  'fal-ai/seedance-2.0',
  imagen_3_fast: 'fal-ai/imagen3/fast',
  imagen_3:      'fal-ai/imagen3',
  flux_i2i:      'fal-ai/flux/dev/image-to-image',
}

// ── Settings cache (5-min TTL) ────────────────────────────
// Avoids a DB round-trip on every request.
// Vercel serverless instances are short-lived so this is safe.

let _settings    = null
let _settingsTtl = 0
const SETTINGS_TTL = 5 * 60 * 1000

const getSettings = async () => {
  if (_settings && Date.now() < _settingsTtl) return _settings

  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['active_provider', 'model_kling', 'model_seedance', 'model_image'])

  if (error) {
    console.warn('[settings] Failed to load, using defaults:', error.message)
    return _settings || {}
  }

  _settings    = {}
  _settingsTtl = Date.now() + SETTINGS_TTL

  for (const row of data || []) {
    try   { _settings[row.key] = JSON.parse(row.value) }
    catch { _settings[row.key] = row.value }
  }

  return _settings
}

// ── WaveSpeed — submit + poll ─────────────────────────────

const callWaveSpeed = async (modelId, input) => {
  // Submit
  const submitRes = await fetch('https://api.wavespeed.ai/api/v3/predictions', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${process.env.WAVESPEED_KEY}`,
    },
    body: JSON.stringify({ model: modelId, input }),
  })

  if (!submitRes.ok) {
    const err = await submitRes.json().catch(() => ({}))
    throw new Error(err.detail || err.message || `WaveSpeed submit error ${submitRes.status}`)
  }

  const { data: submission } = await submitRes.json()
  const predictionId = submission?.id
  if (!predictionId) throw new Error('WaveSpeed: no prediction ID returned')

  // Poll
  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    await sleep(3000)

    const pollRes = await fetch(
      `https://api.wavespeed.ai/api/v3/predictions/${predictionId}`,
      { headers: { Authorization: `Bearer ${process.env.WAVESPEED_KEY}` } }
    )

    if (!pollRes.ok) throw new Error(`WaveSpeed poll error ${pollRes.status}`)

    const { data: result } = await pollRes.json()
    console.log(`[WaveSpeed] ${predictionId} -> ${result?.status}`)

    if (result?.status === 'completed') return extractWaveSpeedUrl(result)
    if (result?.status === 'failed')    throw new Error(result.error || 'WaveSpeed: generation failed')
    // 'queued' | 'processing' -> keep polling
  }

  throw new Error('WaveSpeed: generation timed out after 2 minutes')
}

// WaveSpeed outputs can be a string-URL array OR an object array.
// Handle both shapes defensively.
const extractWaveSpeedUrl = (result) => {
  const outputs = result?.outputs
  if (Array.isArray(outputs) && outputs.length > 0) {
    const first = outputs[0]
    const url   = typeof first === 'string' ? first : first?.url || null
    if (url) return url
  }
  const url = result?.output?.url || result?.output || null
  if (!url) throw new Error('WaveSpeed: no output URL in completed result')
  return url
}

// ── fal.ai — submit + poll (raw fetch, no SDK) ────────────

const callFal = async (modelId, input) => {
  // Submit to queue
  const submitRes = await fetch(`https://queue.fal.run/${modelId}`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Key ${process.env.FAL_KEY}`,
    },
    body: JSON.stringify(input),
  })

  if (!submitRes.ok) {
    const err = await submitRes.json().catch(() => ({}))
    throw new Error(err.detail || err.message || `fal.ai submit error ${submitRes.status}`)
  }

  const { request_id } = await submitRes.json()
  if (!request_id) throw new Error('fal.ai: no request_id returned')

  // Poll status
  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    await sleep(3000)

    const statusRes = await fetch(
      `https://queue.fal.run/${modelId}/requests/${request_id}/status`,
      { headers: { Authorization: `Key ${process.env.FAL_KEY}` } }
    )

    if (!statusRes.ok) throw new Error(`fal.ai poll error ${statusRes.status}`)

    const status = await statusRes.json()
    console.log(`[fal.ai] ${request_id} -> ${status?.status}`)

    if (status?.status === 'COMPLETED') {
      const resultRes = await fetch(
        `https://queue.fal.run/${modelId}/requests/${request_id}`,
        { headers: { Authorization: `Key ${process.env.FAL_KEY}` } }
      )
      const result = await resultRes.json()
      return extractFalUrl(result)
    }
    if (status?.status === 'FAILED') {
      throw new Error(status?.error || 'fal.ai: generation failed')
    }
  }

  throw new Error('fal.ai: generation timed out after 2 minutes')
}

const extractFalUrl = (result) => {
  const url = result?.video?.url
           || result?.videos?.[0]?.url
           || result?.images?.[0]?.url
           || result?.image?.url
           || null
  if (!url) throw new Error('fal.ai: no output URL in completed result')
  return url
}

// ── Prompt enhancement via Claude ─────────────────────────
// Primary:  Claude Sonnet via WaveSpeed LLM gateway (uses WAVESPEED_KEY).
// Fallback: Direct Anthropic API (uses ANTHROPIC_KEY if set).
// Silent fail: returns original prompt if both are unavailable.

const ENHANCE_SYSTEM = `You are an expert AI video and image prompt engineer.
Enhance the user's prompt for cinematic AI generation.
Preserve the EXACT core action and intent — do not change what happens.
Add camera movement, lighting, motion dynamics, and cinematic language.
Keep under 200 words. Return ONLY the enhanced prompt, no explanation.`

const enhancePrompt = async (prompt, type = 'video') => {
  const userMessage = `Enhance this ${type} generation prompt:\n\n${prompt}`

  // Try WaveSpeed LLM gateway first
  try {
    const res = await fetch('https://api.wavespeed.ai/api/v3/llm/messages', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.WAVESPEED_KEY}`,
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 500,
        system:     ENHANCE_SYSTEM,
        messages:   [{ role: 'user', content: userMessage }],
      }),
    })
    if (!res.ok) throw new Error(`WaveSpeed LLM ${res.status}`)
    const data     = await res.json()
    const enhanced = data?.content?.[0]?.text?.trim()
    if (enhanced) return enhanced
    throw new Error('empty response')
  } catch (err) {
    console.warn('[enhancePrompt] WaveSpeed LLM failed:', err.message)
  }

  // Fallback: direct Anthropic API
  if (process.env.ANTHROPIC_KEY) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:  'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         process.env.ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model:      'claude-sonnet-4-20250514',
          max_tokens: 400,
          system:     ENHANCE_SYSTEM,
          messages:   [{ role: 'user', content: userMessage }],
        }),
      })
      if (!res.ok) throw new Error(`Anthropic ${res.status}`)
      const data     = await res.json()
      const enhanced = data?.content?.[0]?.text?.trim()
      if (enhanced) return enhanced
    } catch (err) {
      console.warn('[enhancePrompt] Anthropic fallback failed:', err.message)
    }
  }

  return prompt // silent fail — use original
}

// ── Helpers ───────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const run = (provider, modelKey, input) => {
  if (provider === 'wavespeed') {
    const modelId = WS_MODELS[modelKey]
    if (!modelId) throw new Error(`Unknown WaveSpeed model key: ${modelKey}`)
    return callWaveSpeed(modelId, input)
  }
  const modelId = FAL_MODELS[modelKey]
  if (!modelId) throw new Error(`Unknown fal.ai model key: ${modelKey}`)
  return callFal(modelId, input)
}

// ── Action handlers ───────────────────────────────────────

const handlers = {

  async text_to_image({ prompt, aspectRatio = '9:16', model }, settings, provider) {
    const enhanced = await enhancePrompt(prompt, 'image')
    const modelKey = model || settings.model_image || 'imagen_3_fast'
    const url      = await run(provider, modelKey, {
      prompt:       enhanced,
      aspect_ratio: aspectRatio,
      num_images:   1,
    })
    return { outputUrl: url, outputType: 'image' }
  },

  async image_to_image({ prompt, imageUrl, strength = 0.8 }, settings, provider) {
    const enhanced = await enhancePrompt(prompt, 'image')
    const url      = await run(provider, 'flux_i2i', {
      prompt:     enhanced,
      image_url:  imageUrl,
      strength,
      num_images: 1,
    })
    return { outputUrl: url, outputType: 'image' }
  },

  async text_to_video({ prompt, aspectRatio = '9:16', duration = '5', model }, settings, provider) {
    const enhanced = await enhancePrompt(prompt, 'video')
    const baseKey  = model || settings.model_kling || 'kling_2_5'
    const url      = await run(provider, `${baseKey}_t2v`, {
      prompt:       enhanced,
      aspect_ratio: aspectRatio,
      duration:     parseInt(duration),
    })
    return { outputUrl: url, outputType: 'video' }
  },

  async image_to_video({ prompt, imageUrl, aspectRatio = '9:16', duration = '5', model }, settings, provider) {
    const enhanced = await enhancePrompt(prompt, 'video')
    const modelKey = model || settings.model_kling || 'kling_2_5'
    const url      = await run(provider, modelKey, {
      prompt:       enhanced,
      image_url:    imageUrl,
      aspect_ratio: aspectRatio,
      duration:     parseInt(duration),
    })
    return { outputUrl: url, outputType: 'video' }
  },

  async start_end_frame({ prompt, startFrameUrl, endFrameUrl, aspectRatio = '9:16', duration = '5', model }, settings, provider) {
    const enhanced = await enhancePrompt(prompt, 'video')
    const modelKey = model || settings.model_kling || 'kling_2_5'
    const url      = await run(provider, modelKey, {
      prompt:         enhanced,
      image_url:      startFrameUrl,
      tail_image_url: endFrameUrl,
      aspect_ratio:   aspectRatio,
      duration:       parseInt(duration),
    })
    return { outputUrl: url, outputType: 'video' }
  },

  async end_frame_text({ prompt, endFrameUrl, aspectRatio = '9:16', duration = '5', model }, settings, provider) {
    const enhanced = await enhancePrompt(prompt, 'video')
    const modelKey = model || settings.model_kling || 'kling_2_5'
    const url      = await run(provider, modelKey, {
      prompt:         enhanced,
      tail_image_url: endFrameUrl,
      aspect_ratio:   aspectRatio,
      duration:       parseInt(duration),
    })
    return { outputUrl: url, outputType: 'video' }
  },

  // Template: prompt fetched from DB via RPC — no client prompt needed
  async template_office_handover(params, settings, provider) {
    const { data: prompt } = await supabase.rpc('get_active_prompt', {
      p_template_slug: 'office-handover',
    })
    return handlers.start_end_frame({ ...params, prompt: prompt || '' }, settings, provider)
  },

  async template_memory_lane({ imageUrls, aspectRatio = '9:16', duration = '5', model }, settings, provider) {
    const { data: prompt } = await supabase.rpc('get_active_prompt', {
      p_template_slug: 'memory-lane',
    })
    return handlers.start_end_frame({
      prompt:        prompt || '',
      startFrameUrl: imageUrls[0],
      endFrameUrl:   imageUrls[imageUrls.length - 1],
      aspectRatio,
      duration,
      model,
    }, settings, provider)
  },
}

// ── Main handler ──────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { action, provider: reqProvider, ...params } = req.body

  if (!action) return res.status(400).json({ error: 'Missing action' })

  const fn = handlers[action]
  if (!fn)  return res.status(400).json({ error: `Unknown action: ${action}` })

  // Load settings — degrade gracefully if DB is unreachable
  let settings = {}
  let provider = 'fal'
  try {
    settings = await getSettings()
    provider = reqProvider || settings.active_provider || 'fal'
  } catch (err) {
    console.warn('[generate] Settings fetch failed, defaulting to fal:', err.message)
  }

  const fallback = provider === 'wavespeed' ? 'fal' : 'wavespeed'

  // Try primary provider
  try {
    const result = await fn(params, settings, provider)
    return res.status(200).json({ ...result, provider })
  } catch (primaryErr) {
    console.warn(`[generate] ${provider} failed for "${action}": ${primaryErr.message} — trying ${fallback}`)
  }

  // Try fallback provider
  try {
    const result = await fn(params, settings, fallback)
    return res.status(200).json({ ...result, provider: fallback, _fallback: true })
  } catch (fallbackErr) {
    console.error(`[generate] Both providers failed for "${action}". Fallback: ${fallbackErr.message}`)
    return res.status(500).json({
      error:    'Generation failed on both providers. Please try again.',
      provider,
      fallback,
    })
  }
}
