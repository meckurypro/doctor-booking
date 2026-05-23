// api/understand-prompt.js
// Claude analyses the user's intent and returns structured generation parameters.
// ANTHROPIC_KEY never reaches the client.

const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY

const SYSTEM_PROMPT = `You are the AI brain of Meckury, an AI content creation platform built for African creators.

Your job is to analyse a user's natural language request and return a structured JSON object that tells the generation pipeline exactly what to do.

GENERATION TYPES AVAILABLE:
- text_to_image: Generate an image from text only
- image_to_image: Transform an uploaded image using a prompt
- text_to_video: Generate a video from text only
- image_to_video: Animate a single uploaded image into video
- start_end_frame: Generate video between two uploaded images
- end_frame_text: Generate video that lands on a specific uploaded image
- template_office-handover: Two people, official handover scene (needs 2 images)
- template_memory-lane: A nostalgic video slideshow from multiple photos

RULES:
- If the user mentions "video", "animate", "motion", "cinematic", "clip", "reel" → prefer video types
- If the user mentions "photo", "image", "picture", "portrait", "generate image" → prefer image types
- If the user mentions "handover", "handing over", "transfer of office" → use template_office-handover
- If the user mentions "memories", "memory lane", "throwback", "slideshow", "photos" → use template_memory-lane
- If generation requires uploaded images, set requires_images to the number needed (1 or 2 or "multiple")
- Always write enhanced_prompt in English, cinematic and vivid, under 200 words
- Never include explanation or preamble — return ONLY valid JSON

RESPONSE FORMAT (strict JSON, no markdown):
{
  "type": "text_to_video",
  "templateSlug": null,
  "enhanced_prompt": "...",
  "requires_images": 0,
  "aspect_ratio": "9:16",
  "duration": "5",
  "model": "kling_2_5",
  "confidence": 0.95,
  "user_message": "I'll create a cinematic video from your prompt. No images needed — just tap Generate!"
}

FIELD NOTES:
- type: one of the generation types above. For templates use "template" and set templateSlug
- templateSlug: null unless it's a template (e.g. "office-handover", "memory-lane")
- enhanced_prompt: refined, cinematic version of the user's request
- requires_images: 0 = none, 1 = one image, 2 = two images, "multiple" = memory lane
- aspect_ratio: "9:16" for portraits/mobile content (default), "16:9" for landscapes, "1:1" for square
- duration: "5", "8", or "10" — default "5", use longer for complex scenes
- model: "kling_2_5", "kling_3_0", "seedance_1_5", "seedance_2_0" — default "kling_2_5"
- confidence: 0.0–1.0, how confident you are in the interpretation
- user_message: short, friendly message shown to the user explaining what will be created`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!ANTHROPIC_KEY) {
    return res.status(500).json({ error: 'AI not configured' })
  }

  const { prompt, hasImages = false, imageCount = 0 } = req.body

  if (!prompt?.trim()) {
    return res.status(400).json({ error: 'Prompt is required' })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 600,
        system:     SYSTEM_PROMPT,
        messages: [
          {
            role:    'user',
            content: `User request: "${prompt}"
Context: User has uploaded ${imageCount} image(s). hasImages: ${hasImages}

Analyse this request and return the JSON object.`,
          },
        ],
      }),
    })

    if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`)

    const data = await response.json()
    const text = data.content?.[0]?.text?.trim()

    // Strip any accidental markdown fences
    const clean   = text.replace(/```json|```/g, '').trim()
    const parsed  = JSON.parse(clean)

    // Safety: validate required fields exist
    if (!parsed.type || !parsed.enhanced_prompt) {
      throw new Error('Invalid response structure from AI')
    }

    return res.status(200).json(parsed)
  } catch (error) {
    console.error('understand-prompt error:', error.message)

    // Fallback — return a safe default so the UI never breaks
    return res.status(200).json({
      type:            'text_to_video',
      templateSlug:    null,
      enhanced_prompt: prompt,
      requires_images: 0,
      aspect_ratio:    '9:16',
      duration:        '5',
      model:           'kling_2_5',
      confidence:      0.5,
      user_message:    "I'll create a video from your prompt. Tap Generate to start!",
      fallback:        true,
    })
  }
}
