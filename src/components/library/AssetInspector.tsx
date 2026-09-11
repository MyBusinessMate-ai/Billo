import React, { useState } from 'react'
import type { MediaAsset } from '../../types/pos'
import { usePOS } from '../../context/POSContext'

interface AssetInspectorProps {
  asset: MediaAsset | null
}

export const AssetInspector: React.FC<AssetInspectorProps> = ({ asset }) => {
  const { setAssetAsLogo, deleteAsset, showToast, settings } = usePOS()
  const [copied, setCopied] = useState(false)

  if (!asset) {
    return (
      <div className="lg:col-span-4 bg-surface-container-lowest rounded-DEFAULT shadow-sm p-pad-md flex flex-col items-center justify-center text-center min-h-[360px] sticky top-20">
        <span className="material-symbols-outlined text-[40px] text-on-surface-variant/40 mb-2">
          folder_open
        </span>
        <h4 className="font-headline-sm text-headline-sm text-on-surface">No Asset Selected</h4>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 max-w-xs">
          Click any media item from the asset ledger to inspect file metadata or set brand logos.
        </p>
      </div>
    )
  }

  const isCurrentStoreLogo =
    asset.inUse || settings.logoUrl === asset.url || settings.logoName === asset.fileName

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(asset.url || window.location.origin)
    setCopied(true)
    showToast(`Copied ${asset.fileName} URL to clipboard`, 'info')
    setTimeout(() => setCopied(false), 1500)
  }

  const handleSetLogo = () => {
    setAssetAsLogo(asset.id)
  }

  const getTagBadge = () => {
    if (asset.inUse) return 'Active Store Logo'
    if (asset.category === 'store_logos') return 'Store Media'
    if (asset.category === 'receipt_marks') return 'Receipt Stamp'
    if (asset.category === 'promotional_banners') return 'Promo'
    return 'Product'
  }

  return (
    <div className="lg:col-span-4 bg-surface-container-lowest rounded-DEFAULT shadow-sm p-pad-md flex flex-col gap-pad-md sticky top-20">
      {/* Inspector Header */}
      <div className="flex items-center justify-between pb-pad-xs border-b border-surface-container">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary">info</span>
          <span className="font-headline-sm text-headline-sm text-on-surface">Asset Inspector</span>
        </div>
        <span
          className="px-2 py-0.5 rounded-DEFAULT bg-secondary-container text-on-secondary-container font-label-sm text-[11px] font-semibold"
          id="detail-tag-badge"
        >
          {getTagBadge()}
        </span>
      </div>

      {/* Large Crisp Preview Frame */}
      <div className="relative w-full aspect-video rounded-DEFAULT bg-surface-container-low flex items-center justify-center p-pad-md overflow-hidden">
        {asset.url ? (
          <img
            alt={asset.name}
            className="max-h-32 w-auto object-contain transition-transform"
            src={asset.url}
          />
        ) : (
          <div className="w-16 h-16 rounded-DEFAULT bg-surface-container text-on-surface flex items-center justify-center font-mono-numeric-lg font-bold">
            {asset.fileName.substring(0, 3).toUpperCase()}
          </div>
        )}
        <div className="absolute bottom-2 right-2 bg-surface-container-lowest/90 px-2 py-0.5 rounded text-[11px] font-mono-numeric-sm text-on-surface-variant">
          <span>{asset.resolution || '512 x 512 px'}</span>
        </div>
      </div>

      {/* File Metadata Ledger */}
      <div className="flex flex-col gap-2">
        <span className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">
          File Information
        </span>
        <div className="flex flex-col gap-2 bg-surface-container-low p-pad-sm rounded-DEFAULT text-body-sm">
          <div className="flex items-center justify-between">
            <span className="text-on-surface-variant font-label-sm text-label-sm shrink-0">
              File Name:
            </span>
            <span
              className="font-mono-numeric-sm text-mono-numeric-sm text-on-surface font-semibold truncate max-w-[200px]"
              title={asset.fileName}
            >
              {asset.fileName}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-on-surface-variant font-label-sm text-label-sm shrink-0">
              Usage Status:
            </span>
            <div className="flex items-center gap-1.5 text-secondary text-right truncate">
              <span className="material-symbols-outlined text-[16px] shrink-0">verified</span>
              <span className="font-body-sm text-body-sm text-on-surface truncate">
                {asset.usageDescription ||
                  (isCurrentStoreLogo ? 'Active Store Logo' : 'Unassigned Asset')}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-on-surface-variant font-label-sm text-label-sm shrink-0">
              File Type:
            </span>
            <span className="font-mono-numeric-sm text-mono-numeric-sm text-on-surface">
              {asset.fileType}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-on-surface-variant font-label-sm text-label-sm shrink-0">
              File Size:
            </span>
            <span className="font-mono-numeric-sm text-mono-numeric-sm text-on-surface">
              {asset.size}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-on-surface-variant font-label-sm text-label-sm shrink-0">
              Resolution:
            </span>
            <span className="font-mono-numeric-sm text-mono-numeric-sm text-on-surface">
              {asset.resolution || '512 x 512 px'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-on-surface-variant font-label-sm text-label-sm shrink-0">
              Upload Date:
            </span>
            <span className="font-mono-numeric-sm text-mono-numeric-sm text-on-surface truncate max-w-[190px]">
              {asset.uploadDate}
            </span>
          </div>
        </div>
      </div>

      {/* Action Triggers */}
      <div className="flex flex-col gap-2 pt-pad-xs">
        {/* Row 1: Primary Action (1 in 1 row) */}
        <button
          className="w-full h-button-md p-2 px-4 flex items-center justify-center gap-2 bg-primary text-on-primary rounded-DEFAULT font-label-md text-label-md hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
          type="button"
          onClick={handleSetLogo}
        >
          <span className="material-symbols-outlined text-[18px]">storefront</span>
          <span>Set as Store Logo in Settings</span>
        </button>

        {/* Row 2: Secondary Actions (2 in 1 row) */}
        <div className="grid grid-cols-2 gap-2">
          <button
            className="h-button-md p-2 px-3 flex items-center justify-center gap-1.5 bg-surface-container-low text-on-surface hover:bg-surface-container rounded-DEFAULT font-label-md text-label-md transition-colors cursor-pointer border border-outline-variant/30 shadow-2xs"
            type="button"
            onClick={handleCopyUrl}
          >
            <span className="material-symbols-outlined text-[18px]">
              {copied ? 'done' : 'link'}
            </span>
            <span>{copied ? 'Copied!' : 'Copy URL'}</span>
          </button>
          <button
            className="h-button-md p-2 px-3 flex items-center justify-center gap-1.5 bg-error-container/20 text-error hover:bg-error-container hover:text-on-error-container rounded-DEFAULT font-label-md text-label-md transition-colors cursor-pointer border border-error/20 shadow-2xs"
            type="button"
            onClick={() => deleteAsset(asset.id)}
            title="Delete Asset from Local Registry"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  )
}
