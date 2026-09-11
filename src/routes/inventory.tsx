import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { InventoryMetrics } from '../components/inventory/InventoryMetrics'
import { InventoryTable } from '../components/inventory/InventoryTable'
import { AddProductModal } from '../components/inventory/AddProductModal'
import { usePOS } from '../context/POSContext'

export const Route = createFileRoute('/inventory')({
  component: InventoryPage,
})

function InventoryPage() {
  const { products, showToast } = usePOS()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        'SKU,EAN,Product Name,Category,Cost Price,Selling Price,Margin %,Stock,Status,Last Restocked',
      ]
        .concat(
          products.map(
            (p) =>
              `"${p.sku}","${p.ean}","${p.name}","${p.category}",${p.costPrice},${p.sellingPrice},${p.margin}%,${p.stock},"${p.status}","${p.lastRestocked}"`
          )
        )
        .join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `LedgerPOS_Inventory_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Exported inventory catalog CSV', 'success')
  }

  const handleStockAudit = () => {
    showToast('Stock count audit session initialized for Store #104', 'info')
  }

  return (
    <AppLayout>
      {/* Top Operational Banner & Metric Strips */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-pad-md pb-pad-md">
        <div className="flex flex-col">
          <div className="flex items-center gap-pad-sm flex-wrap">
            <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight">
              Inventory Registry
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-DEFAULT bg-surface-container text-on-surface-variant font-mono-numeric-sm text-mono-numeric-sm">
              {products.length} Active SKUs
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-DEFAULT bg-surface-container-low text-secondary font-label-sm text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
              Live Sync Active
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
            Real-time store catalog, inventory valuations, and supplier reorder triggers.
          </p>
        </div>
        <div className="flex items-center gap-pad-xs flex-wrap">
          <button
            type="button"
            onClick={handleExportCSV}
            className="h-button-h-md px-pad-sm rounded-DEFAULT bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md flex items-center gap-1.5 transition-colors border border-outline-variant/40 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
              download
            </span>
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handleStockAudit}
            className="h-button-h-md px-pad-sm rounded-DEFAULT bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md flex items-center gap-1.5 transition-colors border border-outline-variant/40 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
              inventory
            </span>
            <span>Stock Audit</span>
          </button>
          <button
            id="openModalBtn"
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="h-button-h-md px-pad-md rounded-DEFAULT bg-primary hover:bg-inverse-surface text-on-primary font-label-md text-label-md flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* KPI Pulse Mini-Cards */}
      <InventoryMetrics />

      {/* Main Ledger Data Grid & Filter Bar */}
      <InventoryTable
        onEditProduct={(p) => showToast(`Edit inventory product ${p.name}`, 'info')}
      />

      {/* Add Product Modal */}
      <AddProductModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </AppLayout>
  )
}
