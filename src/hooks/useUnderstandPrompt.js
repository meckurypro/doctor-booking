// src/hooks/useUnderstandPrompt.js

import { useState, useCallback } from 'react'

export const useUnderstandPrompt = () => {
  const [understanding, setUnderstanding] = useState(null)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState(null)

  const understand = useCallback(async (prompt, { hasImages = false, imageCount = 0 } = {}) => {
    if (!prompt?.trim()) return null

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/understand-prompt', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ prompt, hasImages, imageCount }),
      })

      if (!response.ok) throw new Error('Failed to understand prompt')

      const data = await response.json()
      setUnderstanding(data)
      return data
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setUnderstanding(null)
    setError(null)
  }, [])

  return { understand, understanding, loading, error, reset }
}
