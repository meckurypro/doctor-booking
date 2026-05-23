// ============================================================
// TEMPLATE: Memory Lane
// Slug: memory-lane
// Visibility: promptiq (staff only by default)
//
// EDITABLE FIELDS (via Admin → Template Assets):
//   prompt     — the cinematic journey instruction (stored in template_prompts)
//   bgMusic    — optional audio track (Supabase storage: template-assets)
// ============================================================

export default {
  // ── Identity ──────────────────────────────────────────────
  slug:       'memory-lane',
  name:       'Memory Lane',
  category:   'memory_lane',
  visibility: 'promptiq',

  description: 'Transform a series of photos into a cinematic memory journey.',

  instructions: `
Upload between 3 and 20 photos in chronological order.

Tips for best results:
• Use well-lit, clear photos
• Mix of portraits and scenes works great
• Order matters — first photo opens the video, last photo closes it
• The AI creates a smooth cinematic flow between all photos

Billing: 1 credit per photo uploaded.
  `.trim(),

  // ── Input fields ──────────────────────────────────────────
  inputs: [
    {
      key:      'imageFrames',
      type:     'multi_image',
      label:    'Your Photos',
      hint:     'Upload 3–20 photos in order',
      minCount: 3,
      maxCount: 20,
      required: true,
    },
  ],

  // ── Editable from Admin ───────────────────────────────────
  editableFields: [
    {
      key:   'prompt',
      type:  'textarea',
      label: 'Memory Lane Prompt',
      hint:  'The cinematic journey instruction sent to the AI',
    },
    {
      key:    'bgMusic',
      type:   'asset',
      label:  'Background Music',
      hint:   'Optional audio track (mp3/wav)',
      bucket: 'template-assets',
      accept: 'audio/*',
    },
  ],

  // ── Generation settings ───────────────────────────────────
  generationType:   'start_end_frame',
  defaultDuration:  '5',
  defaultAspect:    '9:16',
  supportsDuration: true,
  supportsAspect:   true,
  supportsModel:    true,

  // ── Credit cost ───────────────────────────────────────────
  creditCostPerImage: 1, // charged per photo, not flat
  creditCost:         null, // use creditCostPerImage instead

  // ── Generate ──────────────────────────────────────────────
  generate: async ({ inputs, prompt, aspectRatio, duration, model, provider }) => {
    const urls = inputs.imageFrames // array of uploaded URLs

    return provider('start_end_frame', {
      prompt,
      startFrameUrl: urls[0],
      endFrameUrl:   urls[urls.length - 1],
      aspectRatio:   aspectRatio || '9:16',
      duration:      duration    || '5',
      model:         model       || 'kling_2_5',
    })
  },
}
