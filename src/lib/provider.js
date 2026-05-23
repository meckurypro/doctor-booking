// ============================================================
// PROVIDER ROUTER
// Reads active_provider from DB app_settings and routes to
// fal.ai or WaveSpeed. Falls back to the other on error.
// Settings are cached for 5 minutes so we don't hammer the DB.
// ============================================================

import {
  textToImage,
  imageToImage,
  textToVideo,
  imageToVideo,
  startEndFrameToVideo,
  endFrameToVideo,
} from '@/lib/fal'
import { ws } from '@/lib/wavespeed'
import { supabase } from '@/lib/supabase'

// ── Settings cache ────────────────────────────────────────
let _settingsCache   = null
let _settingsFetchedAt = 0
const CACHE_TTL_MS   = 5 * 60 * 1000 // 5 minutes

const getProviderSettings = async () => {
  const now = Date.now()
  if (_settingsCache && now - _settingsFetchedAt < CACHE_TTL_MS) {
    return _settingsCache
  }

  const { data } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['active_provider', 'model_kling', 'model_seedance', 'model_image'])

  const settings = Object.fromEntries(
    (data || []).map((r) => {
      try { return [r.key, JSON.parse(r.value)] }
      catch { return [r.key, r.value] }
    })
  )

  _settingsCache    = {
    provider:       settings.active_provider   || 'fal',
    modelKling:     settings.model_kling       || 'kling_2_5',
    modelSeedance:  settings.model_seedance    || 'seedance_1_5',
    modelImage:     settings.model_image       || 'imagen_3_fast',
  }
  _settingsFetchedAt = now
  return _settingsCache
}

// Invalidate cache (call after admin changes a setting)
export const invalidateProviderCache = () => { _settingsCache = null }

// ── Unified generation API ────────────────────────────────

/**
 * generate({ type, ...params, onProgress })
 *
 * Automatically picks fal or WaveSpeed, falls back on error.
 * type: 'text_to_image' | 'image_to_image' | 'text_to_video' |
 *       'image_to_video' | 'start_end_frame' | 'end_frame_text'
 */
export const generate = async ({ type, ...params }) => {
  const settings  = await getProviderSettings()
  const { provider, modelKling } = settings

  // Merge model from settings unless caller explicitly set one
  const resolvedParams = {
    ...params,
    model: params.model === 'auto' || !params.model ? modelKling : params.model,
  }

  const falFunctions = {
    text_to_image:   textToImage,
    image_to_image:  imageToImage,
    text_to_video:   textToVideo,
    image_to_video:  imageToVideo,
    start_end_frame: startEndFrameToVideo,
    end_frame_text:  endFrameToVideo,
  }

  const wsFunctions = {
    text_to_image:   ws.textToImage,
    image_to_image:  ws.textToImage, // WaveSpeed uses same endpoint
    text_to_video:   ws.textToVideo,
    image_to_video:  ws.imageToVideo,
    start_end_frame: ws.startEndFrame,
    end_frame_text:  ws.imageToVideo,
  }

  const primary   = provider === 'wavespeed' ? wsFunctions : falFunctions
  const fallback  = provider === 'wavespeed' ? falFunctions : wsFunctions
  const primaryFn = primary[type]
  const fallbackFn = fallback[type]

  if (!primaryFn) throw new Error(`Unknown generation type: ${type}`)

  // Try primary provider
  const result = await primaryFn(resolvedParams)

  if (!result?.error) return result

  // Primary failed — try fallback silently
  console.warn(`[provider] ${provider} failed for ${type}: ${result.error}. Trying fallback.`)
  if (!fallbackFn) return result

  const fallbackResult = await fallbackFn(resolvedParams)
  return fallbackResult
}
