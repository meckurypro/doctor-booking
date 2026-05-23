// ============================================================
// WAVESPEED.AI CLIENT
// All calls proxied through /api/generate (provider = 'wavespeed')
// so the API key never touches the client bundle.
// ============================================================

const callAPI = async (action, payload, onProgress) => {
  const response = await fetch('/api/generate', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ action, provider: 'wavespeed', ...payload }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error || `WaveSpeed API error ${response.status}`)
  }

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('text/event-stream')) {
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

// WaveSpeed model IDs
// https://wavespeed.ai/docs
export const WS_MODELS = {
  kling_2_5:    'wavespeed-ai/kling-v2.5',
  kling_3_0:    'wavespeed-ai/kling-v3',
  seedance_1_5: 'wavespeed-ai/seedance-v1.5-pro',
  seedance_2_0: 'wavespeed-ai/seedance-v2',
}

export const ws = {
  textToVideo: async ({ prompt, aspectRatio = '9:16', duration = '5', model = 'kling_2_5', onProgress }) => {
    try {
      const r = await callAPI('text_to_video', { prompt, aspectRatio, duration, model }, onProgress)
      return { outputUrl: r.outputUrl, outputType: 'video', error: null }
    } catch (e) {
      return { outputUrl: null, outputType: 'video', error: e.message }
    }
  },

  imageToVideo: async ({ prompt, imageUrl, aspectRatio = '9:16', duration = '5', model = 'kling_2_5', onProgress }) => {
    try {
      const r = await callAPI('image_to_video', { prompt, imageUrl, aspectRatio, duration, model }, onProgress)
      return { outputUrl: r.outputUrl, outputType: 'video', error: null }
    } catch (e) {
      return { outputUrl: null, outputType: 'video', error: e.message }
    }
  },

  startEndFrame: async ({ prompt, startFrameUrl, endFrameUrl, aspectRatio = '9:16', duration = '5', model = 'kling_2_5', onProgress }) => {
    try {
      const r = await callAPI('start_end_frame', { prompt, startFrameUrl, endFrameUrl, aspectRatio, duration, model }, onProgress)
      return { outputUrl: r.outputUrl, outputType: 'video', error: null }
    } catch (e) {
      return { outputUrl: null, outputType: 'video', error: e.message }
    }
  },

  textToImage: async ({ prompt, aspectRatio = '9:16', onProgress }) => {
    try {
      const r = await callAPI('text_to_image', { prompt, aspectRatio }, onProgress)
      return { outputUrl: r.outputUrl, outputType: 'image', error: null }
    } catch (e) {
      return { outputUrl: null, outputType: 'image', error: e.message }
    }
  },
}
