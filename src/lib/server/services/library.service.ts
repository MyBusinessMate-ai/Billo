import { createAssetDoc, deleteAssetDoc, subscribeAssets } from '../repositories/library.repository'
import { db } from '../../firebase'
import { cloudinaryService } from './cloudinary.service'
import { env } from '../../../config/env'
import { formatDate } from '../../../utils/formatters'
import type { LibraryAsset as FirestoreAsset } from '../../../types/schema'
import type { MediaAsset as UIMediaAsset, AssetCategory } from '../../../types/pos'

export function mapFirestoreAssetToUI(a: FirestoreAsset): UIMediaAsset {
  return {
    id: a.assetId,
    name: a.name,
    fileName: a.name,
    category: 'store_logos' as AssetCategory,
    url: a.url,
    thumbnailUrl: a.url,
    publicId: a.publicId,
    size: a.size ? `${(a.size / 1024).toFixed(1)} KB` : '120 KB',
    bytes: a.size,
    fileType: a.type || 'image/png',
    resolution: '1024x1024',
    uploadDate: formatDate(a.createdAt),
    uploadedBy: 'Admin',
    inUse: false,
  }
}

export const libraryService = {
  subscribe(onData: (assets: UIMediaAsset[]) => void, onError?: (err: Error) => void) {
    return subscribeAssets((firestoreList) => {
      onData(firestoreList.map(mapFirestoreAssetToUI))
    }, onError)
  },

  async uploadFile(file: File, category: AssetCategory = 'store_logos'): Promise<UIMediaAsset> {
    const assetId = `asset_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    let downloadUrl = ''
    let publicId = ''

    if (env.hasCloudinaryConfig) {
      try {
        const folder = env.cloudinary.folder ? `${env.cloudinary.folder}/${category}` : category
        const result = await cloudinaryService.uploadFile(file, folder)
        downloadUrl = result.secure_url
        publicId = result.public_id
      } catch (err) {
        console.error('[LibraryService] Cloudinary upload error:', err)
        throw err
      }
    } else {
      console.warn(
        '[LibraryService] Cloudinary keys not found in .env (VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET). Using local blob fallback.'
      )
      downloadUrl = URL.createObjectURL(file)
    }

    const nowSeconds = Math.floor(Date.now() / 1000)
    const firestoreAsset: FirestoreAsset = {
      assetId,
      name: file.name,
      url: downloadUrl,
      publicId: publicId || undefined,
      type: file.type || 'image/png',
      size: file.size,
      createdAt: { seconds: nowSeconds, nanoseconds: 0 },
      updatedAt: { seconds: nowSeconds, nanoseconds: 0 },
    }

    if (db) {
      await createAssetDoc(firestoreAsset)
    }

    return mapFirestoreAssetToUI(firestoreAsset)
  },

  async deleteAsset(assetId: string, fileUrl?: string, publicId?: string): Promise<void> {
    // 1. Delete from Cloudinary if possible
    if (publicId || fileUrl) {
      try {
        await cloudinaryService.deleteFile(publicId || fileUrl || '')
      } catch (err) {
        console.warn('[LibraryService] Cloudinary asset deletion note:', err)
      }
    }

    // 2. Delete from Firestore
    if (db) {
      await deleteAssetDoc(assetId)
    }
  },
}
