// ============================================================
// TEMPLATE: Office Handover
// Slug: office-handover
// Visibility: promptiq (staff only by default — admin can flip to public)
//
// EDITABLE FIELDS (via Admin → Template Assets):
//   prompt      — the transition instruction text (stored in template_prompts)
//   bgMusic     — optional background audio (Supabase storage bucket: template-assets)
//   overlayText — optional lower-third text overlay config (JSON in template_assets)
// ============================================================

export default {
  // ── Identity ──────────────────────────────────────────────
  slug:       'office-handover',
  name:       'Office Handover',
  category:   'handover',
  visibility: 'promptiq', // default; admin can toggle

  // ── What staff/users see ──────────────────────────────────
  description: 'Cinematic leadership transition — outgoing person hands over to incoming.',

  instructions: `
Upload a clear portrait photo of the OUTGOING person as the Start Frame.
Upload a clear portrait photo of the INCOMING person as the End Frame.

Tips for best results:
• Head and shoulders framing
• Neutral or office background
• Good lighting — no harsh shadows
• No sunglasses or heavy accessories
• Similar framing in both photos
  `.trim(),

  // ── Input fields shown in TemplateRunner ─────────────────
  inputs: [
    {
      key:    'startFrame',
      type:   'image',
      label:  'Start Frame',
      hint:   'The outgoing person',
      required: true,
    },
    {
      key:    'endFrame',
      type:   'image',
      label:  'End Frame',
      hint:   'The incoming person',
      required: true,
    },
  ],

  // ── Which prompt fields are editable from Admin ───────────
  // These map to keys in template_prompts + template_assets tables
  editableFields: [
    {
      key:   'prompt',
      type:  'textarea',
      label: 'Transition Prompt',
      hint:  'The core instruction sent to the AI model',
    },
    {
      key:    'bgMusic',
      type:   'asset',
      label:  'Background Music',
      hint:   'Optional audio track (mp3/wav). Leave empty for silent.',
      bucket: 'template-assets',
      accept: 'audio/*',
    },
  ],

  // ── Generation settings ───────────────────────────────────
  generationType:  'start_end_frame',
  defaultDuration: '5',
  defaultAspect:   '9:16',
  supportsDuration: true,
  supportsAspect:   true,
  supportsModel:    true,

  // ── Credit cost ───────────────────────────────────────────
  // For staff: FREE (deducted from pool)
  // For public users: this many credits
  creditCost: 2,

  // ── Runtime: generate function ────────────────────────────
  // Called by TemplateRunner after inputs are collected.
  // `prompt` is fetched live from DB (get_active_prompt RPC).
  // `provider` is the resolved generate() function from provider.js.
  generate: async ({ inputs, prompt, aspectRatio, duration, model, provider }) => {
    return provider('start_end_frame', {
      prompt,
      startFrameUrl: inputs.startFrame,
      endFrameUrl:   inputs.endFrame,
      aspectRatio:   aspectRatio || '9:16',
      duration:      duration    || '5',
      model:         model       || 'kling_2_5',
    })
  },
}
