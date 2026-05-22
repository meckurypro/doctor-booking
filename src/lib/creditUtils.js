// src/lib/creditUtils.js

// ── Credit costs ───────────────────────────────────────────
// Source of truth is app_settings in Supabase (admin-editable).
// These are frontend defaults used for instant UI estimation only.

export const CREDIT_COSTS = {
  text_to_image:   1,
  image_to_image:  1,

  text_to_video:   { '5': 3, '8': 4, '10': 5 },
  image_to_video:  { '5': 2, '8': 4, '10': 5 },
  start_end_frame: { '5': 2, '8': 4, '10': 5 },
  end_frame_text:  { '5': 2, '8': 4, '10': 5 },

  template_office_handover:       2,
  template_memory_lane_per_image: 1,
}

export const calculateCreditCost = (type, options = {}) => {
  const { duration = '5', imageCount = 1 } = options

  if (type === 'template_memory_lane') {
    return CREDIT_COSTS.template_memory_lane_per_image * imageCount
  }

  const cost = CREDIT_COSTS[type]
  if (!cost) return 2 // safe default

  if (typeof cost === 'object') {
    return cost[String(duration)] || cost['5'] || 2
  }

  return cost
}
