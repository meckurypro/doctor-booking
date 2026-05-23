// api/enhance-prompt.js
// Vercel Serverless Function — ANTHROPIC_KEY never reaches the client.

const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY

const SYSTEM_PROMPT = `You are an expert AI video and image generation prompt engineer.
Your job is to take a user's prompt and enhance it for better AI generation results.
Rules:
- Keep the CORE ACTION and INTENT exactly as the user described
- Add cinematic language, lighting details, motion descriptions
- Add camera movement suggestions where appropriate
- Keep enhanced prompt under 200 words
- Return ONLY the enhanced prompt — no explanation, no preamble, no quotes
- Never add inappropriate or harmful content
- Preserve any specific instructions about people, faces, outfits`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!ANTHROPIC_KEY) {
    // Key not configured — return original prompt silently
    return res.status(200).json({ enhanced: req.body.prompt })
  }

  const { prompt, generationType = 'video' } = req.body

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
        max_tokens: 400,
        system:     SYSTEM_PROMPT,
        messages: [
          {
            role:    'user',
            content: `Enhance this ${generationType} generation prompt:\n\n${prompt}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`)
    }

    const data     = await response.json()
    const enhanced = data.content?.[0]?.text?.trim()

    return res.status(200).json({ enhanced: enhanced || prompt })
  } catch (error) {
    console.error('Prompt enhancement error:', error.message)
    // Non-critical — fall back to original
    return res.status(200).json({ enhanced: prompt })
  }
}  
