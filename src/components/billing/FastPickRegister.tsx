import React, { useEffect } from 'react'
import type { BillingItem } from '../../types/pos'
import { usePOS } from '../../context/POSContext'

interface FastPickRegisterProps {
  onAddItem: (item: BillingItem) => void
}

export const FastPickRegister: React.FC<FastPickRegisterProps> = ({ onAddItem }) => {
  const { products, showToast } = usePOS()

  const fastPickList = [
    {
      name: 'Fresh Whole Milk',
      cat: 'Dairy',
      price: 65.0,
      key: '1',
    },
    {
      name: 'Artisan Bread',
      cat: 'Bakery',
      price: 180.0,
      key: '2',
    },
    {
      name: 'Green Tea 100g',
      cat: 'Beverages',
      displayCat: 'Bev',
      price: 210.0,
      key: '3',
    },
    {
      name: 'Greek Yogurt',
      cat: 'Dairy',
      price: 110.0,
      key: '4',
    },
    {
      name: 'Sparkling Water',
      cat: 'Beverages',
      displayCat: 'Bev',
      price: 95.0,
      key: '5',
    },
  ]

  const handlePick = (item: (typeof fastPickList)[0]) => {
    const matched = products.find((p) => p.name.includes(item.name))
    onAddItem({
      productId: matched?.id || `fast-${item.key}`,
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
  }, [products])

  return (
    <div className="mt-pad-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
          Fast Pick Register (Top Frequent Items)
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
