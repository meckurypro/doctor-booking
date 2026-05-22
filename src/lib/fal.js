import { fal } from '@fal-ai/client'

// Configure fal client
fal.config({
  credentials: import.meta.env.VITE_FAL_KEY,
})

// ============================================================
// MODEL ENDPOINTS
// ============================================================

const MODELS = {
  kling_2_5: 'fal-ai/kling-video/v2.5/pro/image-to-video',
  kling_2_5_start_end: 'fal-ai/kling-video/v2.5/pro/image-to-video',
  seedance_1_5: 'fal-ai/seedance-1-5-pro',
  imagen_3: 'fal-ai/imagen3',
  imagen_3_fast: 'fal-ai/imagen3/fast',
}

// ============================================================
// UPLOAD HELPER
// ============================================================

export const uploadImage = async (file) => {
  try {
    const url = await fal.storage.upload(file)
    return { url, error: null }
  } catch (error) {
    return { url: null, error: error.message || 'Upload failed' }
  }
}

// ============================================================
// TEXT TO IMAGE
// ============================================================

export const textToImage = async ({
  prompt,
  aspectRatio = '9:16',
  model = 'imagen_3_fast',
  onProgress,
}) => {
  try {
    const result = await fal.subscribe(MODELS[model] || MODELS.imagen_3_fast, {
      input: {
        prompt,
        aspect_ratio: aspectRatio,
        num_images: 1,
        safety_filter_level: 'block_medium_and_above',
      },
      pollInterval: 2000,
      onQueueUpdate: (update) => {
        onProgress?.(update)
      },
    })

    return {
      outputUrl: result.images?.[0]?.url || null,
      outputType: 'image',
      error: null,
    }
  } catch (error) {
    return { outputUrl: null, outputType: 'image', error: error.message || 'Generation failed' }
  }
}

// ============================================================
// IMAGE TO IMAGE
// ============================================================

export const imageToImage = async ({
  prompt,
  imageUrl,
  strength = 0.8,
  onProgress,
}) => {
  try {
    const result = await fal.subscribe('fal-ai/flux/dev/image-to-image', {
      input: {
        prompt,
        image_url: imageUrl,
        strength,
        num_inference_steps: 28,
        num_images: 1,
      },
      pollInterval: 2000,
      onQueueUpdate: onProgress,
    })

    return {
      outputUrl: result.images?.[0]?.url || null,
      outputType: 'image',
      error: null,
    }
  } catch (error) {
    return { outputUrl: null, outputType: 'image', error: error.message || 'Generation failed' }
  }
}

// ============================================================
// TEXT TO VIDEO
// ============================================================

export const textToVideo = async ({
  prompt,
  aspectRatio = '9:16',
  duration = '5',
  model = 'kling_2_5',
  onProgress,
}) => {
  try {
    const result = await fal.subscribe('fal-ai/kling-video/v2.5/pro/text-to-video', {
      input: {
        prompt,
        aspect_ratio: aspectRatio,
        duration: parseInt(duration),
      },
      pollInterval: 3000,
      onQueueUpdate: onProgress,
    })

    return {
      outputUrl: result.video?.url || null,
      outputType: 'video',
      error: null,
    }
  } catch (error) {
    return { outputUrl: null, outputType: 'video', error: error.message || 'Generation failed' }
  }
}

// ============================================================
// IMAGE TO VIDEO (single start frame)
// ============================================================

export const imageToVideo = async ({
  prompt,
  imageUrl,
  aspectRatio = '9:16',
  duration = '5',
  model = 'kling_2_5',
  onProgress,
}) => {
  try {
    const result = await fal.subscribe(MODELS[model] || MODELS.kling_2_5, {
      input: {
        prompt,
        image_url: imageUrl,
        aspect_ratio: aspectRatio,
        duration: parseInt(duration),
      },
      pollInterval: 3000,
      onQueueUpdate: onProgress,
    })

    return {
      outputUrl: result.video?.url || null,
      outputType: 'video',
      error: null,
    }
  } catch (error) {
    return { outputUrl: null, outputType: 'video', error: error.message || 'Generation failed' }
  }
}

// ============================================================
// START + END FRAME TO VIDEO
// ============================================================

export const startEndFrameToVideo = async ({
  prompt,
  startFrameUrl,
  endFrameUrl,
  aspectRatio = '9:16',
  duration = '5',
  model = 'kling_2_5',
  onProgress,
}) => {
  try {
    const result = await fal.subscribe(MODELS[model] || MODELS.kling_2_5, {
      input: {
        prompt,
        image_url: startFrameUrl,
        tail_image_url: endFrameUrl,
        aspect_ratio: aspectRatio,
        duration: parseInt(duration),
      },
      pollInterval: 3000,
      onQueueUpdate: onProgress,
    })

    return {
      outputUrl: result.video?.url || null,
      outputType: 'video',
      error: null,
    }
  } catch (error) {
    return { outputUrl: null, outputType: 'video', error: error.message || 'Generation failed' }
  }
}

// ============================================================
// END FRAME + TEXT TO VIDEO
// ============================================================

export const endFrameToVideo = async ({
  prompt,
  endFrameUrl,
  aspectRatio = '9:16',
  duration = '5',
  onProgress,
}) => {
  try {
    // Use Kling with only tail image
    const result = await fal.subscribe(MODELS.kling_2_5, {
      input: {
        prompt,
        tail_image_url: endFrameUrl,
        aspect_ratio: aspectRatio,
        duration: parseInt(duration),
      },
      pollInterval: 3000,
      onQueueUpdate: onProgress,
    })

    return {
      outputUrl: result.video?.url || null,
      outputType: 'video',
      error: null,
    }
  } catch (error) {
    return { outputUrl: null, outputType: 'video', error: error.message || 'Generation failed' }
  }
}

// ============================================================
// TEMPLATE: OFFICE HANDOVER
// ============================================================

export const officeHandoverTemplate = async ({
  startFrameUrl,
  endFrameUrl,
  aspectRatio = '9:16',
  duration = '5',
  model = 'kling_2_5',
  onProgress,
}) => {
  const prompt = import.meta.env.VITE_TEMPLATE_OFFICE_HANDOVER

  return startEndFrameToVideo({
    prompt,
    startFrameUrl,
    endFrameUrl,
    aspectRatio,
    duration,
    model,
    onProgress,
  })
}

// ============================================================
// TEMPLATE: MEMORY LANE
// ============================================================

export const memoryLaneTemplate = async ({
  imageUrls,
  aspectRatio = '9:16',
  duration = '5',
  onProgress,
}) => {
  // For memory lane we generate transitions between consecutive image pairs
  // then stitch them — for MVP we generate first-to-last as a single video
  const prompt = import.meta.env.VITE_TEMPLATE_MEMORY_LANE

  return startEndFrameToVideo({
    prompt,
    startFrameUrl: imageUrls[0],
    endFrameUrl: imageUrls[imageUrls.length - 1],
    aspectRatio,
    duration: Math.min(parseInt(duration) * imageUrls.length, 15).toString(),
    onProgress,
  })
}

// ============================================================
// CREDIT COSTS PER OPERATION
// Source of truth is app_settings table in Supabase.
// These are frontend defaults used before DB fetch completes.
// Admin can update costs live via Admin Panel without redeploying.
// ============================================================

export const CREDIT_COSTS = {
  // Image generation
  text_to_image:   1,
  image_to_image:  1,

  // Video generation — cost varies by duration
  // 8s raised to 4 to protect margins on all packs
  text_to_video:   { '5': 3, '8': 4, '10': 5 },
  image_to_video:  { '5': 2, '8': 4, '10': 5 },
  start_end_frame: { '5': 2, '8': 4, '10': 5 },
  end_frame_text:  { '5': 2, '8': 4, '10': 5 },

  // Templates
  template_office_handover:       2, // always 5s
  template_memory_lane_per_image: 1, // per image in series
}

export const calculateCreditCost = (type, options = {}) => {
  const { duration = '5', imageCount = 1 } = options

  if (type === 'template_memory_lane') {
    return CREDIT_COSTS.template_memory_lane_per_image * imageCount
  }

  const cost = CREDIT_COSTS[type]
  if (!cost) return 2 // safe default

  // If cost varies by duration
  if (typeof cost === 'object') {
    return cost[String(duration)] || cost['5'] || 2
  }

  return cost
}
