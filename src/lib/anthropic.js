// src/lib/anthropic.js
// Prompt enhancement is proxied through /api/enhance-prompt (Vercel Serverless Function).
// ANTHROPIC_KEY (no VITE_ prefix) lives only on the server.

export const enhancePrompt = async (userPrompt, generationType = 'video') => {
  if (!userPrompt?.trim()) return { enhanced: userPrompt, error: null }

  try {
    const response = await fetch('/api/enhance-prompt', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ prompt: userPrompt, generationType }),
    })

    if (!response.ok) throw new Error(`API error ${response.status}`)

    const { enhanced } = await response.json()
    return { enhanced: enhanced || userPrompt, error: null }
  } catch (error) {
    // Silently fall back to original prompt — enhancement is non-critical
    console.warn('Prompt enhancement failed, using original:', error.message)
    return { enhanced: userPrompt, error: null }
  }
}
