import React, { useEffect, useMemo } from 'react'
import type { BillingItem } from '../../types/pos'
import { usePOS } from '../../context/POSContext'

interface FastPickRegisterProps {
  onAddItem: (item: BillingItem) => void
}

export const FastPickRegister: React.FC<FastPickRegisterProps> = ({ onAddItem }) => {
  const { products, showToast } = usePOS()

  const fastPickList = useMemo(() => {
    return products.slice(0, 5).map((p, idx) => ({
      id: p.id,
      name: p.name,
      cat: p.category || 'General',
      displayCat: p.category ? p.category.slice(0, 4) : 'Gen',
      price: p.sellingPrice,
      key: String(idx + 1),
    }))
  }, [products])

  const handlePick = (item: {
    id: string
    name: string
    cat: string
    displayCat: string
    price: number
    key: string
  }) => {
    onAddItem({
      productId: item.id,
      name: item.name,
      category: item.cat,
      price: item.price,
      quantity: 1,
      total: item.price,
    })
    showToast(`Added: ${item.name}`, 'success')
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && ['1', '2', '3', '4', '5'].includes(e.key)) {
        e.preventDefault()
        const target = fastPickList.find((item) => item.key === e.key)
        if (target) {
          handlePick(target)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [fastPickList])

  if (fastPickList.length === 0) {
    return null
  }

  return (
    <div className="mt-pad-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
          Fast Pick Register (Frequent Items)
        </span>
        <span className="font-mono-numeric-sm text-mono-numeric-sm text-on-surface-variant">
          Alt + [1-5]
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {fastPickList.map((item) => (
          <button
            key={item.key}
            type="button"
            data-cat={item.cat}
            data-name={item.name}
            data-price={item.price.toFixed(2)}
            onClick={() => handlePick(item)}
            className="fast-pick-btn text-left p-2 bg-surface-container-low hover:bg-surface-container rounded-DEFAULT transition-colors cursor-pointer"
          >
            <span className="font-label-sm text-label-sm text-on-surface block truncate font-medium">
              {item.name}
            </span>
            <div className="flex items-center justify-between mt-1">
              <span className="font-mono-numeric-sm text-mono-numeric-sm text-on-surface-variant">
                {item.displayCat || item.cat}
              </span>
              <span className="font-mono-numeric-sm text-mono-numeric-sm font-semibold text-on-surface">
                ₹{item.price}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
