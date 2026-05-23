// src/lib/creditUtils.js

// ============================================================
// CREDIT UTILS
// Single source of truth for credit costs.
// Frontend defaults — DB app_settings is authoritative at runtime.
// ============================================================

export const CREDIT_COSTS = {
  // Images (flat)
  text_to_image:  1,
  image_to_image: 1,

  // Videos (by duration)
  text_to_video:   { '5': 3, '8': 4, '10': 5 },
  image_to_video:  { '5': 2, '8': 4, '10': 5 },
  start_end_frame: { '5': 2, '8': 4, '10': 5 },
  end_frame_text:  { '5': 2, '8': 4, '10': 5 },

  // Templates — public users pay, staff use pool
  template_office_handover:       2,
  template_memory_lane_per_image: 1,
}

/**
 * calculateCreditCost
 * @param {string} type         - generation_type or 'template_xxx'
 * @param {object} opts
 * @param {string} opts.duration    - '5' | '8' | '10'
 * @param {number} opts.imageCount  - for memory lane per-image billing
 */
export const calculateCreditCost = (type, { duration = '5', imageCount = 1 } = {}) => {
  if (type === 'template_memory_lane') {
    return CREDIT_COSTS.template_memory_lane_per_image * imageCount
  }

  const cost = CREDIT_COSTS[type]
  if (!cost) return 2 // safe default

  if (typeof cost === 'object') {
    return cost[String(duration)] ?? cost['5'] ?? 2
  }

  return cost
}
