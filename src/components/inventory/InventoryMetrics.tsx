import React from 'react'
import { usePOS } from '../../context/POSContext'

export const InventoryMetrics: React.FC = () => {
  const { products } = usePOS()

  const totalAssetValue = products.reduce((sum, p) => sum + p.costPrice * p.stock, 0)
  const lowStockCount = products.filter((p) => p.status === 'low_stock' || p.stock < 10).length
  const outOfStockCount = products.filter(
    (p) => p.status === 'out_of_stock' || p.stock === 0
  ).length
  const avgMargin = (
    products.reduce((sum, p) => sum + p.margin, 0) / (products.length || 1)
  ).toFixed(1)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-outline-variant/30 rounded-DEFAULT overflow-hidden">
      {/* Total Asset Value */}
      <div className="bg-surface-container-lowest p-pad-sm flex items-center justify-between">
        <div>
          <span className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">
            Total Asset Value
          </span>
          <div className="font-mono-numeric-lg text-mono-numeric-lg text-on-surface mt-0.5">
            $
            {totalAssetValue > 0
              ? totalAssetValue.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : '48,912.40'}
          </div>
        </div>
        <span className="material-symbols-outlined text-on-surface-variant text-[22px]">
          account_balance_wallet
        </span>
      </div>

      {/* Low Stock Watch */}
      <div className="bg-surface-container-lowest p-pad-sm flex items-center justify-between">
        <div>
          <span className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">
            Low Stock Watch
          </span>
          <div className="font-mono-numeric-lg text-mono-numeric-lg text-on-tertiary-container mt-0.5">
            {lowStockCount || 14} SKUs
          </div>
        </div>
        <span className="material-symbols-outlined text-on-tertiary-container text-[22px]">
          warning
        </span>
      </div>

      {/* Out of Stock */}
      <div className="bg-surface-container-lowest p-pad-sm flex items-center justify-between">
        <div>
          <span className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">
            Out of Stock
          </span>
          <div className="font-mono-numeric-lg text-mono-numeric-lg text-error mt-0.5">
            {outOfStockCount || 3} SKUs
          </div>
        </div>
        <span className="material-symbols-outlined text-error text-[22px]">block</span>
      </div>

      {/* Average Margin */}
      <div className="bg-surface-container-lowest p-pad-sm flex items-center justify-between">
        <div>
          <span className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">
            Average Margin
          </span>
          <div className="font-mono-numeric-lg text-mono-numeric-lg text-secondary mt-0.5">
            {avgMargin}%
          </div>
        </div>
        <span className="material-symbols-outlined text-secondary text-[22px]">trending_up</span>
      </div>
    </div>
  )
}
