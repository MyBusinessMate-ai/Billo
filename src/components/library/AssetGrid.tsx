import React, { useState } from 'react'
import type { MediaAsset } from '../../types/pos'
import { usePOS } from '../../context/POSContext'

interface AssetGridProps {
  onSelectAsset: (asset: MediaAsset) => void
  selectedAssetId?: string
  onUploadClick: () => void
}

export const AssetGrid: React.FC<AssetGridProps> = ({
  onSelectAsset,
  selectedAssetId,
  onUploadClick,
}) => {
  const { assets, totalStorageBytes, maxStorageBytes, maxStorageMb, isStorageLimitReached } =
    usePOS()

  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // Deduplicate assets by ID
  const uniqueAssets = Array.from(new Map(assets.map((a) => [a.id, a])).values())

  const filteredAssets = uniqueAssets.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.fileName.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesSearch
  })

  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage) || 1
  const paginatedAssets = filteredAssets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const formattedUsedStorage =
    totalStorageBytes === 0
      ? '0 KB'
      : totalStorageBytes >= 1024 * 1024 * 1024
        ? `${(totalStorageBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
        : totalStorageBytes >= 1024 * 1024
          ? `${(totalStorageBytes / (1024 * 1024)).toFixed(1)} MB`
          : `${(totalStorageBytes / 1024).toFixed(0)} KB`

  const formattedMaxStorage =
    maxStorageMb >= 1024
      ? `${(maxStorageMb / 1024).toFixed(maxStorageMb % 1024 === 0 ? 0 : 1)} GB`
      : `${maxStorageMb} MB`

  const usagePercent = Math.min(100, Math.round((totalStorageBytes / (maxStorageBytes || 1)) * 100))

  const getTagBadge = (asset: MediaAsset) => {
    if (asset.inUse) return 'Active Store Logo'
    if (asset.category === 'store_logos') return 'Store Media'
    if (asset.category === 'receipt_marks') return 'Receipt Stamp'
    if (asset.category === 'promotional_banners') return 'Promo'
    return 'Product'
  }

  return (
    <div className="flex flex-col gap-pad-sm flex-1">
      {/* Quick Dropzone Info Banner */}
      <div
        id="drop-banner"
        onClick={onUploadClick}
        className={`flex items-center justify-between px-pad-md py-pad-xs rounded-DEFAULT text-on-surface-variant shadow-sm transition-all hover:bg-surface-container cursor-pointer select-none ${
          isStorageLimitReached
            ? 'bg-error-container/40 border border-error/30'
            : 'bg-surface-container-low'
        }`}
      >
        <div className="flex items-center gap-pad-xs">
          <span
            className={`material-symbols-outlined text-[20px] ${
              isStorageLimitReached ? 'text-error' : 'text-secondary'
            }`}
          >
            {isStorageLimitReached ? 'warning' : 'upload_file'}
          </span>
          <span className="font-body-sm text-body-sm">
            {isStorageLimitReached ? (
              <span className="font-medium text-error">
                Storage limit of {formattedMaxStorage} reached. Delete old assets to upload new
                files.
              </span>
            ) : (
              <>
                <span className="font-medium text-on-surface">Drag and drop</span> image files
                anywhere to upload instantly (PNG, JPG, SVG, WebP up to 10MB).
              </>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono-numeric-sm text-mono-numeric-sm text-on-surface-variant">
          <span>Hotkeys</span>
          <span className="px-1.5 py-0.5 rounded-DEFAULT bg-surface-container-highest text-on-surface text-[10px]">
            Ctrl+U
          </span>
        </div>
      </div>

      {/* Top Filter / Search & Organization Bar */}
      <div className="bg-surface-container-lowest p-pad-sm rounded-DEFAULT shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-pad-sm">
        <div className="flex items-center gap-pad-sm flex-1">
          {/* Search Bar */}
          <div className="flex items-center gap-2 px-pad-xs py-1.5 bg-surface-container-low rounded-DEFAULT w-full sm:w-80">
            <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              id="asset-search"
              className="bg-transparent font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none w-full"
              placeholder="Search assets by filename or tag..."
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>
        </div>

        {/* Storage Stats & View Toggle */}
        <div className="flex items-center justify-between sm:justify-end gap-pad-md pt-2 sm:pt-0">
          <div className="flex items-center gap-2 font-mono-numeric-sm text-mono-numeric-sm text-on-surface-variant">
            <span
              className={`w-2 h-2 rounded-full ${
                isStorageLimitReached
                  ? 'bg-error animate-pulse'
                  : usagePercent > 80
                    ? 'bg-amber-500'
                    : 'bg-secondary'
              }`}
            />
            <span>
              Used:{' '}
              <strong className={isStorageLimitReached ? 'text-error' : 'text-on-surface'}>
                {formattedUsedStorage}
              </strong>
              {maxStorageMb > 0 && ` / ${formattedMaxStorage} (${usagePercent}%)`}
            </span>
            <span className="text-on-surface-variant/40">•</span>
            <span>
              {uniqueAssets.length} {uniqueAssets.length === 1 ? 'file' : 'files'}
            </span>
          </div>
          <div className="flex items-center bg-surface-container-low p-1 rounded-DEFAULT gap-1">
            <button
              className={`p-2 rounded-DEFAULT transition-all cursor-pointer flex items-center justify-center ${
                viewMode === 'grid'
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">grid_view</span>
            </button>
            <button
              className={`p-2 rounded-DEFAULT transition-all cursor-pointer flex items-center justify-center ${
                viewMode === 'list'
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              onClick={() => setViewMode('list')}
              title="List View"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">view_list</span>
            </button>
          </div>
        </div>
      </div>

      {/* Asset Cards Grid or List */}
      <div
        id="grid-container"
        className={
          viewMode === 'grid'
            ? 'grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-pad-xs'
            : 'grid grid-cols-1 gap-pad-xs'
        }
      >
        {paginatedAssets.map((asset) => {
          const isSelected = selectedAssetId === asset.id
          const tag = getTagBadge(asset)

          return (
            <div
              key={asset.id}
              onClick={() => onSelectAsset(asset)}
              className={`asset-card group relative rounded-DEFAULT p-pad-xs shadow-sm hover:shadow cursor-pointer transition-all flex justify-between ${
                viewMode === 'grid' ? 'flex-col' : 'flex-row items-center'
              } ${
                isSelected
                  ? 'bg-surface-container ring-1 ring-primary'
                  : 'bg-surface-container-lowest'
              }`}
            >
              <div
                className={`relative rounded-DEFAULT bg-surface-container-low flex items-center justify-center overflow-hidden ${
                  viewMode === 'grid' ? 'w-full aspect-square mb-2' : 'w-14 h-14 shrink-0'
                }`}
              >
                {asset.url ? (
                  <img
                    alt={asset.name}
                    src={asset.url}
                    className={`object-contain transition-transform group-hover:scale-105 ${
                      viewMode === 'grid' ? 'w-full h-full p-2' : 'w-12 h-12'
                    }`}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-DEFAULT bg-surface-container text-on-surface flex items-center justify-center font-mono-numeric-sm font-semibold">
                    {asset.fileName.substring(0, 3).toUpperCase()}
                  </div>
                )}
                {asset.inUse && (
                  <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                    <span className="px-1.5 py-0.5 rounded-DEFAULT bg-secondary text-on-secondary font-label-sm text-[10px] uppercase font-semibold">
                      In Use
                    </span>
                  </div>
                )}
              </div>

              <div className={`flex flex-col ${viewMode === 'list' ? 'flex-1 ml-3' : ''}`}>
                <span className="font-label-md text-label-md text-on-surface truncate font-semibold">
                  {asset.name}
                </span>
                <div className="flex items-center justify-between mt-1 text-on-surface-variant font-mono-numeric-sm text-[11px]">
                  <span className="px-1 py-0.2 rounded bg-surface-container font-label-sm text-[10px]">
                    {tag}
                  </span>
                  <span>{asset.size}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Inline Pagination & Asset Metrics Strip */}
      <div className="flex items-center justify-between bg-surface-container-lowest px-pad-sm py-pad-xs rounded-DEFAULT shadow-sm text-on-surface-variant font-mono-numeric-sm text-mono-numeric-sm">
        <div className="flex items-center gap-2">
          <span>
            Showing{' '}
            <span className="text-on-surface font-semibold">
              {paginatedAssets.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} -{' '}
              {Math.min(currentPage * itemsPerPage, filteredAssets.length)}
            </span>{' '}
            of {filteredAssets.length} items
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            className={`p-2 px-3 py-1.5 rounded font-label-sm text-label-sm font-medium transition-colors ${
              currentPage === 1
                ? 'bg-surface-container-low text-on-surface opacity-60 cursor-not-allowed'
                : 'bg-surface-container-low text-on-surface hover:bg-surface-container cursor-pointer'
            }`}
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            type="button"
          >
            Prev
          </button>
          <button
            className={`p-2 px-3 py-1.5 rounded font-label-sm text-label-sm font-medium transition-colors ${
              currentPage === 1
                ? 'bg-primary text-on-primary font-semibold'
                : 'bg-surface-container-low text-on-surface hover:bg-surface-container cursor-pointer'
            }`}
            onClick={() => setCurrentPage(1)}
            type="button"
          >
            1
          </button>
          {totalPages > 1 && (
            <button
              className={`p-2 px-3 py-1.5 rounded font-label-sm text-label-sm font-medium transition-colors ${
                currentPage === 2
                  ? 'bg-primary text-on-primary font-semibold'
                  : 'bg-surface-container-low text-on-surface hover:bg-surface-container cursor-pointer'
              }`}
              onClick={() => setCurrentPage(2)}
              type="button"
            >
              2
            </button>
          )}
          {totalPages > 2 && (
            <button
              className={`p-2 px-3 py-1.5 rounded font-label-sm text-label-sm font-medium transition-colors ${
                currentPage === 3
                  ? 'bg-primary text-on-primary font-semibold'
                  : 'bg-surface-container-low text-on-surface hover:bg-surface-container cursor-pointer'
              }`}
              onClick={() => setCurrentPage(3)}
              type="button"
            >
              3
            </button>
          )}
          <button
            className={`p-2 px-3 py-1.5 rounded font-label-sm text-label-sm font-medium transition-colors ${
              currentPage >= totalPages
                ? 'bg-surface-container-low text-on-surface opacity-60 cursor-not-allowed'
                : 'bg-surface-container-low text-on-surface hover:bg-surface-container cursor-pointer'
            }`}
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            type="button"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
