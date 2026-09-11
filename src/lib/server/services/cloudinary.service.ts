import { createServerFn } from '@tanstack/react-start'
import { env } from '../../../config/env'

export interface CloudinaryUploadResult {
  secure_url: string
  public_id: string
  format: string
  width?: number
  height?: number
  bytes?: number
  original_filename?: string
}

export interface DeleteCloudinaryParams {
  publicId?: string
  url?: string
}

export function extractPublicIdFromCloudinaryUrl(url: string): string | null {
  if (!url || !url.includes('cloudinary.com')) return null
  try {
    const parts = url.split('/image/upload/')
    if (parts.length < 2) return null
    let path = parts[1]
    // Remove version prefix if present e.g. v12345678/
    path = path.replace(/^v\d+\//, '')
    // Remove file extension
    const lastDotIndex = path.lastIndexOf('.')
    if (lastDotIndex !== -1) {
      path = path.substring(0, lastDotIndex)
    }
    return decodeURIComponent(path)
  } catch {
    return null
  }
}

/**
 * Server function to securely delete an asset from Cloudinary.
 * Executes on the server with API key / Secret signing if provided.
 */
export const deleteCloudinaryAssetServerFn = createServerFn({ method: 'POST' })
  .validator((data: DeleteCloudinaryParams) => data)
  .handler(async ({ data }: { data: DeleteCloudinaryParams }) => {
    let publicId = data.publicId
    if (!publicId && data.url) {
      publicId = extractPublicIdFromCloudinaryUrl(data.url) || undefined
    }

    if (!publicId) {
      return { success: false, reason: 'No public ID found' }
    }

    const cloudName =
      (typeof process !== 'undefined' &&
        (process.env?.CLOUDINARY_CLOUD_NAME || process.env?.VITE_CLOUDINARY_CLOUD_NAME)) ||
      'pkf1prla'
    const apiKey =
      (typeof process !== 'undefined' &&
        (process.env?.CLOUDINARY_API_KEY || process.env?.VITE_CLOUDINARY_API_KEY)) ||
      ''
    const apiSecret =
      (typeof process !== 'undefined' &&
        (process.env?.CLOUDINARY_API_SECRET || process.env?.VITE_CLOUDINARY_API_SECRET)) ||
      ''

    if (!cloudName) {
      return { success: false, reason: 'Cloudinary cloud name missing' }
    }

    try {
      const timestamp = Math.floor(Date.now() / 1000).toString()
      const formData = new URLSearchParams()
      formData.append('public_id', publicId)

      if (apiKey && apiSecret) {
        // Node.js crypto module for SHA-1 HMAC signing
        const cryptoModule = await import('node:crypto')
        const toSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`
        const signature = cryptoModule.createHash('sha1').update(toSign).digest('hex')
        formData.append('timestamp', timestamp)
        formData.append('api_key', apiKey)
        formData.append('signature', signature)
      } else {
        const uploadPreset =
          (typeof process !== 'undefined' &&
            (process.env?.CLOUDINARY_UPLOAD_PRESET ||
              process.env?.VITE_CLOUDINARY_UPLOAD_PRESET)) ||
          'Gold n Glow'
        if (uploadPreset) {
          formData.append('upload_preset', uploadPreset)
        }
      }

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      })

      const resJson = await res.json().catch(() => null)
      const isOk = res.ok && (resJson?.result === 'ok' || resJson?.result === 'not found')
      return { success: isOk, result: resJson }
    } catch (err: any) {
      console.error('[Cloudinary Server Destroy Error]:', err)
      return { success: false, error: err?.message || String(err) }
    }
  })

export const cloudinaryService = {
  /**
   * Upload an image file directly to Cloudinary via unsigned upload preset.
   */
  async uploadFile(file: File, folder?: string): Promise<CloudinaryUploadResult> {
    const cloudName = env.cloudinary.cloudName
    const uploadPreset = env.cloudinary.uploadPreset
    const targetFolder = folder !== undefined ? folder : env.cloudinary.folder

    if (!cloudName || !uploadPreset) {
      throw new Error(
        'Cloudinary credentials missing in .env (VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET).'
      )
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', uploadPreset)
    if (targetFolder) {
      formData.append('folder', targetFolder)
    }

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorJson = await response.json().catch(() => null)
      let message = errorJson?.error?.message || response.statusText || 'Upload failed'
      if (message.toLowerCase().includes('unsigned')) {
        message = `${message}. (In Cloudinary Console -> Settings ⚙️ -> Upload -> Edit your preset -> Change 'Signing Mode' to 'Unsigned' and click Save)`
      }
      throw new Error(`Cloudinary error: ${message}`)
    }

    const result = await response.json()
    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      original_filename: result.original_filename,
    }
  },

  /**
   * Delete an image from Cloudinary by public ID or URL using the server function.
   */
  async deleteFile(publicIdOrUrl: string): Promise<boolean> {
    if (!publicIdOrUrl) return false

    const publicId = publicIdOrUrl.startsWith('http')
      ? extractPublicIdFromCloudinaryUrl(publicIdOrUrl) || undefined
      : publicIdOrUrl

    try {
      const res = await deleteCloudinaryAssetServerFn({
        data: { publicId, url: publicIdOrUrl.startsWith('http') ? publicIdOrUrl : undefined },
      })
      return res?.success ?? false
    } catch (err) {
      console.warn('[CloudinaryService] Server deletion call error:', err)
      return false
    }
  },
}
