import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { AssetGrid } from '../components/library/AssetGrid'
import { AssetInspector } from '../components/library/AssetInspector'
import { UploadAssetModal } from '../components/library/UploadAssetModal'
import { usePOS } from '../context/POSContext'

export const Route = createFileRoute('/library')({
  component: LibraryPage,
})

function LibraryPage() {
  const { assets } = usePOS()

  // Deduplicated assets list
  const uniqueAssets = Array.from(new Map(assets.map((a) => [a.id, a])).values())
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)

  // Current selected asset safely resolved from available assets
  const selectedAsset =
    (selectedAssetId ? uniqueAssets.find((a) => a.id === selectedAssetId) : null) ||
    uniqueAssets[0] ||
    null

  // Hotkey Ctrl+U for upload
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
        e.preventDefault()
        setIsUploadModalOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <AppLayout>
      {/* Page Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-pad-sm pb-pad-xs">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-display-lg text-display-lg text-on-surface">Asset Library</span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
            Manage store logos, receipt stamps, product visuals, and promotional media across
            registers.
          </p>
        </div>
        <div className="flex items-center gap-pad-xs">
          <button
            className="h-button-md p-2 px-4 flex items-center gap-2 rounded-DEFAULT bg-primary text-on-primary hover:bg-on-primary-fixed-variant font-label-md text-label-md font-semibold transition-colors shadow-sm cursor-pointer"
            id="trigger-upload"
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
          >
            <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
            <span>Upload Asset</span>
          </button>
        </div>
      </div>

      {/* Main Content Workspace: Left Asset Grid + Right Details Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-pad-md items-start">
        <div className="lg:col-span-8 flex flex-col">
          <AssetGrid
            onSelectAsset={(asset) => setSelectedAssetId(asset.id)}
            selectedAssetId={selectedAsset?.id}
            onUploadClick={() => setIsUploadModalOpen(true)}
          />
        </div>

        <AssetInspector asset={selectedAsset} />
      </div>

      {/* Upload Modal */}
      <UploadAssetModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} />
    </AppLayout>
  )
}
