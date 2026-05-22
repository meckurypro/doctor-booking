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
  calculateCreditCost,
} from '@/lib/fal'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export const useGenerate = () => {
  const { user, refreshProfile } = useAuth()
  const [status, setStatus] = useState('idle') // idle | uploading | enhancing | generating | done | error
  const [progress, setProgress] = useState(null)
  const [result, setResult] = useState(null)
  const [generationId, setGenerationId] = useState(null)
  const [error, setError] = useState(null)

  const reset = () => {
    setStatus('idle')
    setProgress(null)
    setResult(null)
    setGenerationId(null)
    setError(null)
  }

  // Get active prompt from database for templates
  const getTemplatePrompt = async (templateSlug) => {
    const { data, error } = await supabase.rpc('get_active_prompt', {
      p_template_slug: templateSlug,
    })
    if (error || !data) throw new Error('Template prompt not found')
    return data
  }

  const generate = async ({
    type,           // generation_type
    templateId,
    templateSlug,
    prompt,
    startFrame,     // File object
    endFrame,       // File object
    imageFrames,    // Array of File objects (memory lane)
    aspectRatio,
    duration,
    model,
    shouldEnhance = true,
  }) => {
    if (!user) {
      toast.error('Please sign in to generate')
      return
    }

    try {
      reset()
      setStatus('uploading')

      // Calculate credit cost
      const imageCount = imageFrames?.length || 1
      const creditCost = calculateCreditCost(
        templateSlug ? `template_${templateSlug.replace('-', '_')}` : type,
        { duration, imageCount }
      )

      // Create generation record
      const { data: genRecord, error: genError } = await generationsDb.create({
        user_id: user.id,
        template_id: templateId || null,
        generation_type: type,
        status: 'pending',
        model: model || 'kling_2_5',
        aspect_ratio: aspectRatio || '9:16',
        duration: duration || '5',
        credits_charged: creditCost,
      })

      if (genError) throw new Error('Failed to create generation record')
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

      // Refresh profile to show updated credits
      refreshProfile()

      // Upload images
      let startFrameUrl, endFrameUrl, imageUrls = []

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

      // Update record with uploaded URLs
      await generationsDb.update(genRecord.id, {
        start_frame_url: startFrameUrl,
        end_frame_url: endFrameUrl,
        input_image_urls: imageUrls.length > 0 ? imageUrls : null,
        status: 'processing',
      })

      setStatus('enhancing')

      // Get prompt (from DB for templates, or enhance user prompt)
      let finalPrompt = prompt

      if (templateSlug) {
        finalPrompt = await getTemplatePrompt(templateSlug)
      } else if (shouldEnhance && prompt) {
        const outputType = type.includes('video') ? 'video' : 'image'
        const { enhanced } = await enhancePrompt(prompt, outputType)
        finalPrompt = enhanced
      }

      // Update record with prompts
      await generationsDb.update(genRecord.id, {
        prompt: prompt || null,
        enhanced_prompt: finalPrompt,
      })

      setStatus('generating')

      // Call appropriate generation function
      const onProgress = (update) => setProgress(update)
      let generationResult

      switch (type) {
        case 'text_to_image':
          generationResult = await textToImage({ prompt: finalPrompt, aspectRatio, onProgress })
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
          }
          break

        default:
          throw new Error('Unknown generation type')
      }

      if (generationResult.error) throw new Error(generationResult.error)

      // Update generation record as completed
      await generationsDb.update(genRecord.id, {
        status: 'completed',
        output_url: generationResult.outputUrl,
        output_type: generationResult.outputType,
      })

      setResult(generationResult)
      setStatus('done')

      return { generationId: genRecord.id, ...generationResult }

    } catch (err) {
      setError(err.message)
      setStatus('error')
      toast.error(err.message || 'Generation failed')

      // Update generation as failed (trigger will auto-refund)
      if (generationId) {
        await generationsDb.update(generationId, {
          status: 'failed',
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
