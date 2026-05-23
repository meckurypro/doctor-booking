// src/hooks/useGenerate.js
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { generations as generationsDb } from '@/lib/supabase'
import { enhancePrompt } from '@/lib/anthropic'
import {
  uploadImage,
  textToImage,
  imageToImage,
  textToVideo,
  imageToVideo,
  startEndFrameToVideo,
  endFrameToVideo,
  officeHandoverTemplate,
  memoryLaneTemplate,
} from '@/lib/fal'
import { calculateCreditCost } from '@/lib/creditUtils'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export const useGenerate = () => {
  const { user, refreshProfile } = useAuth()

  const [status,       setStatus]       = useState('idle')
  const [progress,     setProgress]     = useState(null)
  const [result,       setResult]       = useState(null)
  const [generationId, setGenerationId] = useState(null)
  const [error,        setError]        = useState(null)

  const reset = () => {
    setStatus('idle')
    setProgress(null)
    setResult(null)
    setGenerationId(null)
    setError(null)
  }

  const getTemplatePrompt = async (templateSlug) => {
    const { data, error } = await supabase.rpc('get_active_prompt', {
      p_template_slug: templateSlug,
    })
    if (error || !data) throw new Error('Template prompt not found')
    return data
  }

  const generate = async ({
    type,
    templateId,
    templateSlug,
    prompt,
    startFrame,
    endFrame,
    imageFrames,
    aspectRatio,
    duration,
    model,
    shouldEnhance = true,
  }) => {
    if (!user) { toast.error('Please sign in to generate'); return null }

    // Use a local var for generationId so the catch block always has
    // the latest value — state updates are async and would be stale.
    let localGenId = null

    try {
      reset()
      setStatus('uploading')

      const imageCount = imageFrames?.length || 1
      const creditCost = calculateCreditCost(
        templateSlug ? `template_${templateSlug.replace(/-/g, '_')}` : type,
        { duration, imageCount }
      )

      // Create generation record first
      const { data: genRecord, error: genError } = await generationsDb.create({
        user_id:         user.id,
        template_id:     templateId || null,
        generation_type: type,
        status:          'pending',
        model:           model || 'kling_2_5',
        aspect_ratio:    aspectRatio || '9:16',
        duration:        duration    || '5',
        credits_charged: creditCost,
      })

      if (genError) throw new Error('Failed to create generation record')

      localGenId = genRecord.id
      setGenerationId(genRecord.id)

      // Deduct credits
      const { data: deductResult } = await generationsDb.deductCredits(
        user.id,
        creditCost,
        genRecord.id
      )

      if (!deductResult?.success) {
        throw new Error(deductResult?.error || 'Insufficient credits')
      }

      // Refresh credits display immediately
      refreshProfile()

      // ── Upload images ────────────────────────────────────
      let startFrameUrl = null
      let endFrameUrl   = null
      const imageUrls   = []

      if (startFrame) {
        const { url, error: uploadErr } = await uploadImage(startFrame)
        if (uploadErr) throw new Error('Failed to upload start frame')
        startFrameUrl = url
      }

      if (endFrame) {
        const { url, error: uploadErr } = await uploadImage(endFrame)
        if (uploadErr) throw new Error('Failed to upload end frame')
        endFrameUrl = url
      }

      if (imageFrames?.length > 0) {
        for (const frame of imageFrames) {
          const { url, error: uploadErr } = await uploadImage(frame)
          if (uploadErr) throw new Error('Failed to upload image')
          imageUrls.push(url)
        }
      }

      await generationsDb.update(genRecord.id, {
        start_frame_url:   startFrameUrl,
        end_frame_url:     endFrameUrl,
        input_image_urls:  imageUrls.length > 0 ? imageUrls : null,
        status:            'processing',
      })

      // ── Prompt resolution ────────────────────────────────
      setStatus('enhancing')

      let finalPrompt = prompt

      if (templateSlug) {
        finalPrompt = await getTemplatePrompt(templateSlug)
      } else if (shouldEnhance && prompt) {
        const outputType = type.includes('video') ? 'video' : 'image'
        const { enhanced } = await enhancePrompt(prompt, outputType)
        finalPrompt = enhanced
      }

      await generationsDb.update(genRecord.id, {
        prompt:          prompt      || null,
        enhanced_prompt: finalPrompt || null,
      })

      // ── Generate ─────────────────────────────────────────
      setStatus('generating')

      const onProgress = (update) => setProgress(update)
      let generationResult

      switch (type) {
        case 'text_to_image':
          generationResult = await textToImage({ prompt: finalPrompt, aspectRatio, model, onProgress })
          break

        case 'image_to_image':
          generationResult = await imageToImage({ prompt: finalPrompt, imageUrl: startFrameUrl, onProgress })
          break

        case 'text_to_video':
          generationResult = await textToVideo({ prompt: finalPrompt, aspectRatio, duration, model, onProgress })
          break

        case 'image_to_video':
          generationResult = await imageToVideo({ prompt: finalPrompt, imageUrl: startFrameUrl, aspectRatio, duration, model, onProgress })
          break

        case 'start_end_frame':
          generationResult = await startEndFrameToVideo({ prompt: finalPrompt, startFrameUrl, endFrameUrl, aspectRatio, duration, model, onProgress })
          break

        case 'end_frame_text':
          generationResult = await endFrameToVideo({ prompt: finalPrompt, endFrameUrl, aspectRatio, duration, onProgress })
          break

        case 'template':
          if (templateSlug === 'office-handover') {
            generationResult = await officeHandoverTemplate({ startFrameUrl, endFrameUrl, aspectRatio, duration, model, onProgress })
          } else if (templateSlug === 'memory-lane') {
            generationResult = await memoryLaneTemplate({ imageUrls, aspectRatio, duration, onProgress })
          } else {
            throw new Error(`Unknown template: ${templateSlug}`)
          }
          break

        default:
          throw new Error(`Unknown generation type: ${type}`)
      }

      if (generationResult?.error) throw new Error(generationResult.error)

      await generationsDb.update(genRecord.id, {
        status:      'completed',
        output_url:  generationResult.outputUrl,
        output_type: generationResult.outputType,
      })

      setResult(generationResult)
      setStatus('done')

      return { generationId: genRecord.id, ...generationResult }

    } catch (err) {
      setError(err.message)
      setStatus('error')

      // Credits auto-refunded by DB trigger on status = 'failed'
      toast.error(`${err.message || 'Generation failed'} — credits will be refunded automatically.`)

      if (localGenId) {
        await generationsDb.update(localGenId, {
          status:        'failed',
          error_message: err.message,
        })
      }

      return null
    }
  }

  return {
    generate,
    status,
    progress,
    result,
    generationId,
    error,
    reset,
    isLoading: ['uploading', 'enhancing', 'generating'].includes(status),
  }
}
