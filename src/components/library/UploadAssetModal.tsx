import React, { useState, useRef } from 'react'
import { usePOS } from '../../context/POSContext'
import type { AssetCategory } from '../../types/pos'

interface UploadAssetModalProps {
  isOpen: boolean
  onClose: () => void
}

export const UploadAssetModal: React.FC<UploadAssetModalProps> = ({ isOpen, onClose }) => {
  const {
    uploadAssetFile,
    showToast,
    isStorageLimitReached,
    maxStorageMb,
    totalStorageBytes,
    maxStorageBytes,
  } = usePOS()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string>('')
  const [assetName, setAssetName] = useState('')
  const [category, setCategory] = useState<AssetCategory>('store_logos')
  const [isUploading, setIsUploading] = useState(false)

  if (!isOpen) return null

  const isFileOverQuota = Boolean(
    maxStorageBytes > 0 && selectedFile && totalStorageBytes + selectedFile.size > maxStorageBytes
  )

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (maxStorageBytes > 0 && totalStorageBytes + file.size > maxStorageBytes) {
        showToast(
          `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds remaining storage quota (${maxStorageMb} MB limit).`,
          'error'
        )
      }
      setSelectedFile(file)
      setFilePreview(URL.createObjectURL(file))
      if (!assetName) {
        setAssetName(file.name.replace(/\.[^/.]+$/, ''))
      }
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      if (maxStorageBytes > 0 && totalStorageBytes + file.size > maxStorageBytes) {
        showToast(
          `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds remaining storage quota (${maxStorageMb} MB limit).`,
          'error'
        )
      }
      setSelectedFile(file)
      setFilePreview(URL.createObjectURL(file))
      if (!assetName) {
        setAssetName(file.name.replace(/\.[^/.]+$/, ''))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedFile) {
      showToast('Please select an image file to upload', 'warning')
      return
    }

    if (maxStorageBytes > 0 && totalStorageBytes + selectedFile.size > maxStorageBytes) {
      showToast(
        `Cannot upload: Storage quota of ${maxStorageMb} MB exceeded. Delete old assets first.`,
        'error'
      )
      return
    }

    setIsUploading(true)
    try {
      await uploadAssetFile(selectedFile, category)
      handleClose()
    } catch (err: any) {
      console.error('Upload failed:', err)
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    setSelectedFile(null)
    setFilePreview('')
    setAssetName('')
    setIsUploading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-inverse-surface/30 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest rounded-DEFAULT shadow-2xl max-w-md w-full overflow-hidden border border-outline-variant/40">
        {/* Header */}
        <div className="p-pad-md bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[22px]">
              cloud_upload
            </span>
            <div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">
                Upload Media Asset
              </h3>
              <p className="font-body-sm text-[11px] text-on-surface-variant">
                Upload store logos, stamps, and product media
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-on-surface-variant hover:text-on-surface rounded-DEFAULT hover:bg-surface-container transition-colors cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="p-pad-md flex flex-col gap-pad-sm font-body-sm text-body-sm"
        >
          {/* Storage Warning Banner if quota reached */}
          {(isStorageLimitReached || isFileOverQuota) && (
            <div className="p-3 bg-error-container/30 border border-error/30 rounded-DEFAULT flex items-start gap-2 text-error">
              <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">warning</span>
              <div className="font-body-sm text-body-sm">
                <p className="font-semibold">
                  {isStorageLimitReached ? 'Storage Quota Limit Reached' : 'File Exceeds Quota'}
                </p>
                <p className="text-[11px] opacity-90 mt-0.5">
                  Used: {(totalStorageBytes / (1024 * 1024)).toFixed(1)} MB / {maxStorageMb} MB.{' '}
                  Please delete older assets to free up space.
                </p>
              </div>
            </div>
          )}

          {/* File Dropzone */}
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface font-semibold mb-1">
              Select Image File *
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp, image/svg+xml"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-outline-variant/60 hover:border-primary rounded-DEFAULT p-4 text-center cursor-pointer bg-surface-container-low/40 hover:bg-surface-container-low transition-all flex flex-col items-center justify-center gap-2"
            >
              {filePreview ? (
                <div className="flex items-center gap-3 w-full">
                  <img
                    src={filePreview}
                    alt="Preview"
                    className="w-14 h-14 object-contain rounded bg-surface-container-lowest border p-1"
                  />
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-label-sm text-on-surface font-semibold truncate">
                      {selectedFile?.name}
                    </p>
                    <p className="text-[11px] text-on-surface-variant">
                      {(selectedFile?.size ? selectedFile.size / 1024 : 0).toFixed(1)} KB • Click to
                      change
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <span className="material-symbols-outlined text-outline-variant text-[32px]">
                    add_photo_alternate
                  </span>
                  <div>
                    <p className="font-label-sm text-on-surface font-medium">
                      Click to browse or drag & drop image
                    </p>
                    <p className="text-[11px] text-on-surface-variant">PNG, JPG, WebP, or SVG</p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="block font-label-sm text-label-sm text-on-surface font-semibold mb-1">
              Asset Name
            </label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-DEFAULT bg-surface-container-low border border-outline-variant/40 focus-within:bg-surface-container-lowest focus-within:border-primary transition-all shadow-2xs">
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                title
              </span>
              <input
                type="text"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                placeholder="e.g. Brand Store Logo Mark"
                className="w-full bg-transparent font-body-sm text-body-sm text-on-surface focus:outline-none placeholder:text-on-surface-variant/50"
              />
            </div>
          </div>

          <div>
            <label className="block font-label-sm text-label-sm text-on-surface font-semibold mb-1">
              Asset Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full h-11 px-3 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-DEFAULT text-on-surface font-body-sm focus:outline-none focus:bg-surface-container-lowest focus:border-primary cursor-pointer shadow-2xs"
            >
              <option value="store_logos">Store Logos</option>
              <option value="product_photos">Product Photos</option>
              <option value="receipt_marks">Receipt & QR Marks</option>
              <option value="promotional_banners">Promotional Banners</option>
            </select>
          </div>

          <div className="pt-pad-xs border-t border-outline-variant/30 flex items-center justify-end gap-2 mt-2">
            <button
              type="button"
              disabled={isUploading}
              onClick={handleClose}
              className="p-2 h-button-md px-4 rounded-DEFAULT bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md transition-colors cursor-pointer border border-outline-variant/30 shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !selectedFile || isFileOverQuota || isStorageLimitReached}
              className="p-2 h-button-md px-4 rounded-DEFAULT bg-primary hover:bg-on-primary-fixed-variant text-on-primary font-label-md text-label-md font-semibold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                  <span>{isStorageLimitReached ? 'Quota Limit Reached' : 'Upload Asset'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
