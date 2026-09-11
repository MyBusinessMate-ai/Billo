import React, { useState, useRef, useEffect, useMemo } from 'react'
import type { BillingItem } from '../../types/pos'
import { usePOS } from '../../context/POSContext'

interface ProductScannerProps {
  onAddItem: (item: BillingItem) => void
}

export const ProductScanner: React.FC<ProductScannerProps> = ({ onAddItem }) => {
  const { products, categories, showToast } = usePOS()
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [categorySearchInput, setCategorySearchInput] = useState<string>('')
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState<boolean>(false)
  const [activeIndex, setActiveIndex] = useState<number>(0)

  const [productName, setProductName] = useState<string>('')
  const [customPrice, setCustomPrice] = useState<number>(0)
  const [itemGstPercent, setItemGstPercent] = useState<number | ''>('')
  const [quantity, setQuantity] = useState<number>(1)

  // const scanInputRef = useRef<HTMLInputElement>(null)
  const categoryContainerRef = useRef<HTMLDivElement>(null)
  const categoryInputRef = useRef<HTMLInputElement>(null)
  const categoryListRef = useRef<HTMLUListElement>(null)

  // Global F2 hotkey (commented out while scanner is hidden)
  /*
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault()
        scanInputRef.current?.focus()
        scanInputRef.current?.select()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
  */

  // Close category dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        categoryContainerRef.current &&
        !categoryContainerRef.current.contains(e.target as Node)
      ) {
        setIsCategoryDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Scroll active item into view during arrow key navigation
  useEffect(() => {
    if (isCategoryDropdownOpen && categoryListRef.current && activeIndex >= 0) {
      const activeEl = categoryListRef.current.children[activeIndex] as HTMLElement
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [activeIndex, isCategoryDropdownOpen])

  // Filter categories with priority: StartsWith first, then Contains
  const filteredCategories = useMemo(() => {
    const query = categorySearchInput.trim().toLowerCase()
    if (!query) return categories

    const startsWith: typeof categories = []
    const contains: typeof categories = []

    for (const cat of categories) {
      const name = cat.categoryName.toLowerCase()
      if (name.startsWith(query)) {
        startsWith.push(cat)
      } else if (name.includes(query)) {
        contains.push(cat)
      }
    }

    return [...startsWith, ...contains]
  }, [categories, categorySearchInput])

  const handleSelectCategory = (catName: string) => {
    setSelectedCategory(catName)
    setCategorySearchInput(catName)
    setIsCategoryDropdownOpen(false)
    setActiveIndex(0)

    const matched = products.find((p) => p.category === catName)
    if (matched) {
      setProductName(matched.name)
      setCustomPrice(matched.sellingPrice)
    }
  }

  const handleCategoryInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setCategorySearchInput(val)
    setSelectedCategory(val)
    setIsCategoryDropdownOpen(true)
    setActiveIndex(0)
  }

  const handleCategoryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!isCategoryDropdownOpen) {
        setIsCategoryDropdownOpen(true)
      } else {
        setActiveIndex((prev) => Math.min(prev + 1, Math.max(0, filteredCategories.length - 1)))
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!isCategoryDropdownOpen) {
        setIsCategoryDropdownOpen(true)
      } else {
        setActiveIndex((prev) => Math.max(prev - 1, 0))
      }
    } else if (e.key === 'Enter') {
      if (isCategoryDropdownOpen && filteredCategories.length > 0) {
        e.preventDefault()
        const selected = filteredCategories[activeIndex] || filteredCategories[0]
        if (selected) {
          handleSelectCategory(selected.categoryName)
        }
      }
    } else if (e.key === 'Escape') {
      setIsCategoryDropdownOpen(false)
    }
  }

  /*
  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!skuInput.trim()) return

    const query = skuInput.trim().toLowerCase()
    const match = products.find(
      (p) =>
        p.sku?.toLowerCase() === query ||
        p.ean?.toLowerCase() === query ||
        p.name?.toLowerCase().includes(query) ||
        p.id?.toLowerCase() === query
    )

    if (match) {
      onAddItem({
        productId: match.id,
        name: match.name,
        category: match.category || selectedCategory || 'General',
        price: match.sellingPrice,
        quantity: 1,
        total: match.sellingPrice,
      })
      setSkuInput('')
      showToast(`Scanned: ${match.name}`, 'success')
    } else {
      // Add as quick item if not found in catalog
      const catToUse = selectedCategory || categorySearchInput || 'General'
      onAddItem({
        productId: `item-${Date.now()}`,
        name: skuInput.trim(),
        category: catToUse,
        price: customPrice > 0 ? customPrice : 150.0,
        quantity: 1,
        total: customPrice > 0 ? customPrice : 150.0,
      })
      setSkuInput('')
      showToast(`Added: ${skuInput.trim()}`, 'success')
    }
  }
  */

  const handleManualAdd = () => {
    if (customPrice <= 0) {
      showToast('Please enter item price (₹)', 'warning')
      return
    }
    const catToUse = selectedCategory.trim() || categorySearchInput.trim() || 'General'
    const nameToUse = productName.trim() || catToUse

    const matched = products.find((p) => p.name.toLowerCase() === nameToUse.toLowerCase())
    onAddItem({
      productId: matched?.id || `item-${Date.now()}`,
      name: nameToUse,
      category: catToUse,
      price: customPrice,
      quantity: quantity,
      total: customPrice * quantity,
      gstPercent: typeof itemGstPercent === 'number' && itemGstPercent > 0 ? itemGstPercent : 0,
    })
    setProductName('')
    setCustomPrice(0)
    setItemGstPercent('')
    setQuantity(1)
    setSelectedCategory('')
    setCategorySearchInput('')
    showToast(`Added ${quantity}x ${nameToUse}`, 'success')
  }

  return (
    <div className="bg-surface-container-lowest rounded-DEFAULT p-pad-md shadow-sm">
      {/* Header with Title */}
      <div className="flex items-center justify-between mb-pad-sm">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary text-[20px]">add_box</span>
          <span className="font-headline-sm text-headline-sm text-on-surface">Product Entry</span>
        </div>
      </div>

      {/* Form Fields Row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 mb-pad-md items-end">
        {/* Searchable Category Combobox */}
        <div className="md:col-span-3 relative" ref={categoryContainerRef}>
          <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
            Category ({categories.length || '88'})
          </label>
          <div className="relative flex items-center">
            <input
              ref={categoryInputRef}
              id="prod-category-search"
              type="text"
              value={categorySearchInput}
              onChange={handleCategoryInputChange}
              onFocus={() => setIsCategoryDropdownOpen(true)}
              onKeyDown={handleCategoryKeyDown}
              placeholder="Pick category or write"
              autoComplete="off"
              className="w-full bg-surface-container-low px-2.5 py-1.5 pr-8 rounded-DEFAULT font-body-md text-body-md text-on-surface focus:outline-none border border-outline-variant/30 focus:border-primary/60 transition-colors"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setIsCategoryDropdownOpen((prev) => !prev)}
              className="absolute right-1 text-on-surface-variant/70 hover:text-on-surface p-1 rounded-DEFAULT transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isCategoryDropdownOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          </div>

          {/* Autocomplete Dropdown List */}
          {isCategoryDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-surface-container-lowest border border-outline-variant/40 rounded-DEFAULT shadow-xl z-40 max-h-56 overflow-y-auto">
              {filteredCategories.length > 0 ? (
                <ul ref={categoryListRef} className="py-1">
                  {filteredCategories.map((cat, idx) => {
                    const isSelected = selectedCategory === cat.categoryName
                    const isHighlighted = idx === activeIndex
                    return (
                      <li
                        key={cat.categoryId || cat.categoryName}
                        onClick={() => handleSelectCategory(cat.categoryName)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`px-3 py-1.5 text-body-sm flex items-center justify-between cursor-pointer transition-colors ${
                          isHighlighted
                            ? 'bg-primary/10 text-primary font-medium'
                            : isSelected
                              ? 'bg-surface-container text-on-surface font-semibold'
                              : 'text-on-surface hover:bg-surface-container-low'
                        }`}
                      >
                        <span className="truncate">{cat.categoryName}</span>
                        <span className="text-[10px] font-mono-numeric-sm text-on-surface-variant/60 ml-2 shrink-0">
                          {cat.categoryId}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <div className="px-3 py-2 text-on-surface-variant text-body-sm text-center">
                  No matching category found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Product / Item Description */}
        <div className="md:col-span-3">
          <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
            Product / Item Description
          </label>
          <input
            id="prod-name"
            type="text"
            value={productName}
            placeholder="e.g. Bridal Bangles / Matte Lipstick"
            onChange={(e) => setProductName(e.target.value)}
            className="w-full bg-surface-container-low px-2.5 py-1.5 rounded-DEFAULT font-body-md text-body-md text-on-surface focus:outline-none border border-outline-variant/30 focus:border-primary/60 transition-colors"
          />
        </div>

        {/* Price (₹) */}
        <div className="md:col-span-2">
          <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
            Price (₹)
          </label>
          <input
            id="prod-price"
            type="number"
            step="1"
            min="0"
            value={customPrice || ''}
            placeholder="0.00"
            onChange={(e) => setCustomPrice(parseFloat(e.target.value) || 0)}
            className="w-full bg-surface-container-low px-2.5 py-1.5 rounded-DEFAULT font-mono-numeric-md text-mono-numeric-md text-on-surface focus:outline-none text-right border border-outline-variant/30 focus:border-primary/60 transition-colors"
          />
        </div>

        {/* GST (%) */}
        <div className="md:col-span-1">
          <label
            className="block font-label-sm text-label-sm text-on-surface-variant mb-1 truncate"
            title="GST (%)"
          >
            GST (%)
          </label>
          <input
            id="prod-gst"
            type="number"
            step="0.5"
            min="0"
            max="100"
            value={itemGstPercent}
            placeholder="0"
            onChange={(e) => {
              const val = e.target.value
              setItemGstPercent(val === '' ? '' : Math.max(0, parseFloat(val) || 0))
            }}
            className="w-full bg-surface-container-low px-2 py-1.5 rounded-DEFAULT font-mono-numeric-md text-mono-numeric-md text-on-surface focus:outline-none text-center border border-outline-variant/30 focus:border-primary/60 transition-colors"
          />
        </div>

        {/* Quantity Controls & Add Button */}
        <div className="md:col-span-3 flex items-center gap-1.5">
          <div className="flex items-center bg-surface-container-low rounded-DEFAULT px-1 py-0.5 border border-outline-variant/30 shrink-0">
            <button
              id="qty-minus"
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-6 h-7 flex items-center justify-center font-bold text-on-surface hover:bg-surface-container rounded-DEFAULT cursor-pointer transition-colors"
            >
              -
            </button>
            <span
              id="qty-display"
              className="w-5 text-center font-mono-numeric-md text-mono-numeric-md font-semibold text-on-surface"
            >
              {quantity}
            </span>
            <button
              id="qty-plus"
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="w-6 h-7 flex items-center justify-center font-bold text-on-surface hover:bg-surface-container rounded-DEFAULT cursor-pointer transition-colors"
            >
              +
            </button>
          </div>

          <button
            id="add-to-bill-btn"
            type="button"
            onClick={handleManualAdd}
            className="flex-1 min-w-[70px] h-[34px] bg-primary hover:bg-inverse-surface text-on-primary rounded-DEFAULT px-2.5 flex items-center justify-center gap-1 font-label-md text-label-md font-medium transition-all shadow-xs active:scale-98 cursor-pointer whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Add</span>
          </button>
        </div>
      </div>
    </div>
  )
}
