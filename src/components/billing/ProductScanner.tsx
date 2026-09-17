import React, { useState, useRef, useEffect, useMemo } from 'react'
import type { BillingItem } from '../../types/pos'
import { DEFAULT_CATEGORY_FIELDS_CONFIG } from '../../types/schema'
import { usePOS } from '../../context/POSContext'

interface ProductScannerProps {
  onAddItem: (item: BillingItem) => void
}

export const ProductScanner: React.FC<ProductScannerProps> = ({ onAddItem }) => {
  const { products, categories, showToast } = usePOS()

  // Category Selection
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [categorySearchInput, setCategorySearchInput] = useState<string>('')
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState<boolean>(false)
  const [activeIndex, setActiveIndex] = useState<number>(0)

  // 7 Default Fields State
  const [productName, setProductName] = useState<string>('')
  const [productDescription, setProductDescription] = useState<string>('')
  const [customPrice, setCustomPrice] = useState<number>(0)
  const [itemGstPercent, setItemGstPercent] = useState<number | ''>('')
  const [quantity, setQuantity] = useState<number>(1)
  const [discount, setDiscount] = useState<number | ''>('')

  // Custom Fields State: { [fieldId]: value }
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({})
  const [missingRequiredFieldIds, setMissingRequiredFieldIds] = useState<Set<string>>(new Set())

  const categoryContainerRef = useRef<HTMLDivElement>(null)
  const categoryInputRef = useRef<HTMLInputElement>(null)
  const categoryListRef = useRef<HTMLUListElement>(null)

  // Active Category Object & Configurations
  const activeCategoryObj = useMemo(() => {
    if (!selectedCategory) return undefined
    return categories.find(
      (c) =>
        c.categoryName.trim().toLowerCase() === selectedCategory.trim().toLowerCase() ||
        c.categoryId === selectedCategory
    )
  }, [categories, selectedCategory])

  const defaultFieldsConfig = activeCategoryObj?.defaultFieldsConfig || DEFAULT_CATEGORY_FIELDS_CONFIG
  const categoryCustomFields = useMemo(() => {
    return (activeCategoryObj?.customFields || []).filter((f) => f.showInBilling !== false)
  }, [activeCategoryObj])

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

  // Scroll active item into view during arrow navigation
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
    setMissingRequiredFieldIds(new Set())

    const catObj = categories.find(
      (c) => c.categoryName.trim().toLowerCase() === catName.trim().toLowerCase()
    )
    const matched = products.find((p) => p.category === catName)

    if (matched) {
      setProductName(matched.name)
      setCustomPrice(
        catObj && typeof catObj.basePrice === 'number' && catObj.basePrice > 0
          ? catObj.basePrice
          : matched.sellingPrice
      )
    } else if (catObj && typeof catObj.basePrice === 'number' && catObj.basePrice > 0) {
      setCustomPrice(catObj.basePrice)
    } else {
      setCustomPrice(0)
    }

    // Set Default GST
    const defaultGst = catObj?.defaultFieldsConfig?.gst?.defaultValue
    if (typeof defaultGst === 'number') {
      setItemGstPercent(defaultGst)
    } else {
      setItemGstPercent(0)
    }

    // Set Default Item Count
    const defaultCount = catObj?.defaultFieldsConfig?.itemCount?.defaultValue
    if (typeof defaultCount === 'number' && defaultCount > 0) {
      setQuantity(defaultCount)
    } else {
      setQuantity(1)
    }

    // Initialize custom field defaults
    const initialCustom: Record<string, any> = {}
    if (catObj?.customFields) {
      catObj.customFields.forEach((cf) => {
        if (cf.defaultValue !== undefined) {
          initialCustom[cf.id] = cf.defaultValue
        }
      })
    }
    setCustomFieldValues(initialCustom)
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
      } else {
        e.preventDefault()
        handleManualAdd()
      }
    } else if (e.key === 'Escape') {
      setIsCategoryDropdownOpen(false)
    }
  }

  const handleCustomFieldChange = (fieldId: string, val: any) => {
    let processedVal = val
    if (typeof val === 'string') {
      const fieldConfig = categoryCustomFields.find((f) => f.id === fieldId)
      if (fieldConfig?.textCasing === 'uppercase') {
        processedVal = val.toUpperCase()
      } else if (fieldConfig?.textCasing === 'lowercase') {
        processedVal = val.toLowerCase()
      }
    }
    setCustomFieldValues((prev) => ({
      ...prev,
      [fieldId]: processedVal,
    }))
    if (missingRequiredFieldIds.has(fieldId)) {
      setMissingRequiredFieldIds((prev) => {
        const next = new Set(prev)
        next.delete(fieldId)
        return next
      })
    }
  }

  const handleManualAdd = () => {
    const missing = new Set<string>()

    // Check category
    const catToUse = selectedCategory.trim() || categorySearchInput.trim()
    if (!catToUse) {
      showToast('Please select or specify a category', 'warning')
      return
    }

    // Validate Product Item (Name)
    if (defaultFieldsConfig.productItem.enabled && defaultFieldsConfig.productItem.required) {
      if (!productName.trim()) {
        missing.add('productItem')
      }
    }

    // Validate Product Description
    if (defaultFieldsConfig.productDescription.enabled && defaultFieldsConfig.productDescription.required) {
      if (!productDescription.trim()) {
        missing.add('productDescription')
      }
    }

    // Validate Price
    if (defaultFieldsConfig.price.enabled && defaultFieldsConfig.price.required) {
      if (customPrice <= 0) {
        missing.add('price')
      }
    }

    // Validate Item Count
    if (defaultFieldsConfig.itemCount.enabled && defaultFieldsConfig.itemCount.required) {
      if (quantity <= 0) {
        missing.add('itemCount')
      }
    }

    // Validate Custom Fields
    categoryCustomFields.forEach((cf) => {
      if (cf.required) {
        const val = customFieldValues[cf.id]
        if (val === undefined || val === null || val === '') {
          missing.add(cf.id)
        }
      }
    })

    if (missing.size > 0) {
      setMissingRequiredFieldIds(missing)
      showToast('Please fill all required fields marked with *', 'warning')
      return
    }

    setMissingRequiredFieldIds(new Set())

    const nameToUse = productName.trim() || catToUse
    const matched = products.find((p) => p.name.toLowerCase() === nameToUse.toLowerCase())
    const lineDiscount = typeof discount === 'number' && discount > 0 ? discount : 0
    const rawTotal = customPrice * quantity
    const lineTotal = Math.max(0, rawTotal - lineDiscount)

    // Ensure custom fields values strictly honor textCasing
    const normalizedCustomFields: Record<string, any> = {}
    categoryCustomFields.forEach((cf) => {
      const v = customFieldValues[cf.id]
      if (v !== undefined && v !== null && v !== '') {
        if (typeof v === 'string' && cf.textCasing === 'uppercase') {
          normalizedCustomFields[cf.id] = v.toUpperCase()
        } else if (typeof v === 'string' && cf.textCasing === 'lowercase') {
          normalizedCustomFields[cf.id] = v.toLowerCase()
        } else {
          normalizedCustomFields[cf.id] = v
        }
      }
    })

    onAddItem({
      productId: matched?.id || `item-${Date.now()}`,
      name: nameToUse,
      category: catToUse,
      description: productDescription.trim() || undefined,
      price: customPrice,
      quantity: quantity,
      total: lineTotal,
      gstPercent:
        typeof itemGstPercent === 'number' && itemGstPercent >= 0 ? itemGstPercent : undefined,
      discountAmount: lineDiscount > 0 ? lineDiscount : undefined,
      customFields:
        Object.keys(normalizedCustomFields).length > 0 ? normalizedCustomFields : undefined,
      customFieldConfigs: activeCategoryObj?.customFields,
    })

    // Reset all entry inputs including category
    setSelectedCategory('')
    setCategorySearchInput('')
    setProductName('')
    setProductDescription('')
    setDiscount('')
    setCustomPrice(0)
    setItemGstPercent(0)
    setQuantity(1)
    setCustomFieldValues({})
    setMissingRequiredFieldIds(new Set())

    showToast(`Added ${quantity}x ${nameToUse}`, 'success')

    // Refocus category search input for high-speed next entry
    setTimeout(() => {
      categoryInputRef.current?.focus()
    }, 50)
  }

  const handleClearFields = () => {
    setSelectedCategory('')
    setCategorySearchInput('')
    setProductName('')
    setProductDescription('')
    setDiscount('')
    setCustomPrice(0)
    setItemGstPercent(0)
    setQuantity(1)
    setCustomFieldValues({})
    setMissingRequiredFieldIds(new Set())
    categoryInputRef.current?.focus()
  }

  const itemRawSubtotal = (customPrice || 0) * quantity
  const itemTaxRate = typeof itemGstPercent === 'number' ? itemGstPercent : 0
  const itemDiscountVal = typeof discount === 'number' ? discount : 0
  const itemTaxableSubtotal = Math.max(0, itemRawSubtotal - itemDiscountVal)
  const itemTaxVal = (itemTaxableSubtotal * itemTaxRate) / 100
  const itemCalculatedTotal = Math.max(0, itemTaxableSubtotal + itemTaxVal)

  return (
    <div className="bg-surface-container-lowest rounded-DEFAULT p-pad-md shadow-sm border border-outline-variant/30 space-y-4">
      {/* Header with Title & Active Category Indicator */}
      <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary text-[20px]">add_box</span>
          <span className="font-headline-sm text-headline-sm text-on-surface">Product Entry</span>
          {activeCategoryObj && (
            <span className="bg-primary/10 text-primary text-[11px] font-mono px-2 py-0.5 rounded font-semibold border border-primary/20">
              Active: {activeCategoryObj.categoryName}
            </span>
          )}
        </div>

        {activeCategoryObj && (
          <span className="text-[11px] text-on-surface-variant font-medium">
            {categoryCustomFields.length} custom {categoryCustomFields.length === 1 ? 'field' : 'fields'} active
          </span>
        )}
      </div>

      {/* Main Dynamic Real-Estate Form Rows */}
      <div className="space-y-3.5">
        {/* Row 1: Category & Product Item (Name) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
          {/* Field 1: Category Combobox (Always Active) */}
          <div className="md:col-span-4 relative" ref={categoryContainerRef}>
            <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1 font-semibold">
              Category ({categories.length}) <span className="text-error">*</span>
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
                className="w-full h-10 bg-surface-container-low px-3 pr-8 rounded-DEFAULT font-body-md text-body-md text-on-surface focus:outline-none border border-outline-variant/40 focus:border-primary focus:ring-1 focus:ring-primary transition-all"
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

            {/* Dropdown Options */}
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
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="truncate">{cat.categoryName}</span>
                            {typeof cat.basePrice === 'number' && cat.basePrice > 0 && (
                              <span className="text-[10px] font-mono-numeric-sm bg-secondary/15 text-secondary px-1.5 py-0.2 rounded font-medium shrink-0">
                                ₹{cat.basePrice}
                              </span>
                            )}
                          </div>
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

          {/* Field 2: Product Item (Name) - If Enabled */}
          {defaultFieldsConfig.productItem.enabled && (
            <div className="md:col-span-8">
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1 font-semibold">
                Product Item / Name {defaultFieldsConfig.productItem.required && <span className="text-error">*</span>}
              </label>
              <input
                id="prod-name"
                type="text"
                value={productName}
                placeholder="e.g. Bridal Bangles / Matte Lipstick"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleManualAdd()
                }}
                onChange={(e) => {
                  setProductName(e.target.value)
                  if (missingRequiredFieldIds.has('productItem')) {
                    setMissingRequiredFieldIds((prev) => {
                      const next = new Set(prev)
                      next.delete('productItem')
                      return next
                    })
                  }
                }}
                className={`w-full h-10 bg-surface-container-low px-3 rounded-DEFAULT font-body-md text-body-md text-on-surface focus:outline-none border transition-all ${
                  missingRequiredFieldIds.has('productItem')
                    ? 'border-error focus:ring-1 focus:ring-error'
                    : 'border-outline-variant/40 focus:border-primary focus:ring-1 focus:ring-primary'
                }`}
              />
            </div>
          )}
        </div>

        {/* Row 2: Product Description - Multi-line Text Box */}
        {defaultFieldsConfig.productDescription.enabled && (
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1 font-semibold">
              Description {defaultFieldsConfig.productDescription.required && <span className="text-error">*</span>}
            </label>
            <textarea
              id="prod-desc"
              rows={2}
              value={productDescription}
              placeholder="e.g. Size 2.6, Velvet Finish, Handcrafted..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleManualAdd()
                }
              }}
              onChange={(e) => {
                setProductDescription(e.target.value)
                if (missingRequiredFieldIds.has('productDescription')) {
                  setMissingRequiredFieldIds((prev) => {
                    const next = new Set(prev)
                    next.delete('productDescription')
                    return next
                  })
                }
              }}
              className={`w-full bg-surface-container-low px-3 py-2 rounded-DEFAULT font-body-md text-body-md text-on-surface focus:outline-none border transition-all resize-y ${
                missingRequiredFieldIds.has('productDescription')
                  ? 'border-error focus:ring-1 focus:ring-error'
                  : 'border-outline-variant/40 focus:border-primary focus:ring-1 focus:ring-primary'
              }`}
            />
          </div>
        )}

        {/* Row 3: Commercial Numerical Controls (4 Evenly Balanced Columns) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-12 gap-3 items-start">
          {/* Field 4: Price (₹) - If Enabled */}
          {defaultFieldsConfig.price.enabled && (
            <div className="col-span-1 sm:col-span-2 md:col-span-3">
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1 font-semibold">
                Price (₹) {defaultFieldsConfig.price.required && <span className="text-error">*</span>}
              </label>
              <input
                id="prod-price"
                type="number"
                step="1"
                min="0"
                value={customPrice || ''}
                placeholder="0.00"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleManualAdd()
                }}
                onChange={(e) => {
                  setCustomPrice(parseFloat(e.target.value) || 0)
                  if (missingRequiredFieldIds.has('price')) {
                    setMissingRequiredFieldIds((prev) => {
                      const next = new Set(prev)
                      next.delete('price')
                      return next
                    })
                  }
                }}
                className={`w-full h-10 bg-surface-container-low px-3 rounded-DEFAULT font-mono-numeric-md text-mono-numeric-md text-on-surface focus:outline-none text-right border transition-all ${
                  missingRequiredFieldIds.has('price')
                    ? 'border-error focus:ring-1 focus:ring-error'
                    : 'border-outline-variant/40 focus:border-primary focus:ring-1 focus:ring-primary'
                }`}
              />
            </div>
          )}

          {/* Field 5: GST (%) - If Enabled */}
          {defaultFieldsConfig.gst.enabled && (
            <div className="col-span-1 sm:col-span-2 md:col-span-3">
              <label
                className="block font-label-sm text-label-sm text-on-surface-variant mb-1 font-semibold"
                title="GST Percentage"
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleManualAdd()
                }}
                onChange={(e) => {
                  const val = e.target.value
                  setItemGstPercent(val === '' ? '' : Math.max(0, parseFloat(val) || 0))
                }}
                className="w-full h-10 bg-surface-container-low px-3 rounded-DEFAULT font-mono-numeric-md text-mono-numeric-md text-on-surface focus:outline-none text-center border border-outline-variant/40 focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          )}

          {/* Field 6: Item Count / Quantity - If Enabled */}
          {defaultFieldsConfig.itemCount.enabled && (
            <div className="col-span-1 sm:col-span-2 md:col-span-3">
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1 font-semibold">
                Item Count {defaultFieldsConfig.itemCount.required && <span className="text-error">*</span>}
              </label>
              <div className="flex items-center bg-surface-container-low rounded-DEFAULT px-1.5 border border-outline-variant/40 h-10">
                <button
                  id="qty-minus"
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 flex items-center justify-center font-bold text-on-surface hover:bg-surface-container rounded-DEFAULT cursor-pointer transition-colors"
                >
                  -
                </button>
                <span
                  id="qty-display"
                  className="flex-1 text-center font-mono-numeric-md text-mono-numeric-md font-semibold text-on-surface"
                >
                  {quantity}
                </span>
                <button
                  id="qty-plus"
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-8 h-8 flex items-center justify-center font-bold text-on-surface hover:bg-surface-container rounded-DEFAULT cursor-pointer transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Field 7: Discount - If Enabled */}
          {defaultFieldsConfig.discount.enabled && (
            <div className="col-span-1 sm:col-span-2 md:col-span-3">
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1 font-semibold">
                Discount (₹)
              </label>
              <input
                id="prod-discount"
                type="number"
                min="0"
                value={discount}
                placeholder="0.00"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleManualAdd()
                }}
                onChange={(e) => {
                  const val = e.target.value
                  setDiscount(val === '' ? '' : parseFloat(val) || 0)
                }}
                className="w-full h-10 bg-surface-container-low px-3 rounded-DEFAULT font-mono-numeric-md text-mono-numeric-md text-on-surface focus:outline-none text-right border border-outline-variant/40 focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          )}
        </div>

        {/* Row 4: Category Custom Fields (if any) */}
        {categoryCustomFields.length > 0 && (
          <div className="pt-2 border-t border-outline-variant/20">
            <span className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold block mb-2">
              Category Custom Attributes
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-start">
              {categoryCustomFields.map((cf) => {
                const val = customFieldValues[cf.id] ?? ''
                const isMissing = missingRequiredFieldIds.has(cf.id)
                const colSpan = cf.type === 'textarea' ? 'md:col-span-12' : 'md:col-span-4'

                return (
                  <div key={cf.id} className={colSpan}>
                    <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1 font-semibold truncate" title={cf.name}>
                      {cf.name} {cf.required && <span className="text-error">*</span>}
                    </label>

                    {cf.type === 'select' ? (
                      <select
                        value={val}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleManualAdd()
                        }}
                        onChange={(e) => handleCustomFieldChange(cf.id, e.target.value)}
                        className={`w-full h-10 bg-surface-container-low px-3 rounded-DEFAULT text-body-sm text-on-surface focus:outline-none border transition-all cursor-pointer ${
                          isMissing ? 'border-error focus:ring-1 focus:ring-error' : 'border-outline-variant/40 focus:border-primary focus:ring-1 focus:ring-primary'
                        }`}
                      >
                        <option value="">{cf.placeholder || `Select ${cf.name}...`}</option>
                        {(cf.options || []).map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : cf.type === 'boolean' ? (
                      <label className="flex items-center gap-2 h-10 px-3 bg-surface-container-low rounded-DEFAULT border border-outline-variant/40 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={Boolean(val)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleManualAdd()
                          }}
                          onChange={(e) => handleCustomFieldChange(cf.id, e.target.checked)}
                          className="rounded text-primary focus:ring-primary"
                        />
                        <span className="text-xs text-on-surface font-medium">{cf.placeholder || 'Yes'}</span>
                      </label>
                    ) : cf.type === 'textarea' ? (
                      <textarea
                        rows={2}
                        value={val}
                        placeholder={cf.placeholder || `Enter ${cf.name}...`}
                        style={{
                          textTransform:
                            cf.textCasing === 'uppercase'
                              ? 'uppercase'
                              : cf.textCasing === 'lowercase'
                                ? 'lowercase'
                                : 'none',
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleManualAdd()
                          }
                        }}
                        onChange={(e) => handleCustomFieldChange(cf.id, e.target.value)}
                        className={`w-full bg-surface-container-low px-3 py-2 rounded-DEFAULT text-body-sm text-on-surface focus:outline-none border transition-all resize-y ${
                          isMissing ? 'border-error focus:ring-1 focus:ring-error' : 'border-outline-variant/40 focus:border-primary focus:ring-1 focus:ring-primary'
                        }`}
                      />
                    ) : cf.type === 'number' ? (
                      <input
                        type="number"
                        value={val}
                        placeholder={cf.placeholder || '0'}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleManualAdd()
                        }}
                        onChange={(e) => handleCustomFieldChange(cf.id, e.target.value === '' ? '' : parseFloat(e.target.value))}
                        className={`w-full h-10 bg-surface-container-low px-3 rounded-DEFAULT font-mono-numeric-sm text-xs text-on-surface focus:outline-none border transition-all ${
                          isMissing ? 'border-error focus:ring-1 focus:ring-error' : 'border-outline-variant/40 focus:border-primary focus:ring-1 focus:ring-primary'
                        }`}
                      />
                    ) : cf.type === 'date' ? (
                      <input
                        type="date"
                        value={val}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleManualAdd()
                        }}
                        onChange={(e) => handleCustomFieldChange(cf.id, e.target.value)}
                        className={`w-full h-10 bg-surface-container-low px-3 rounded-DEFAULT text-xs text-on-surface focus:outline-none border transition-all ${
                          isMissing ? 'border-error focus:ring-1 focus:ring-error' : 'border-outline-variant/40 focus:border-primary focus:ring-1 focus:ring-primary'
                        }`}
                      />
                    ) : (
                      <input
                        type="text"
                        value={val}
                        placeholder={cf.placeholder || `Enter ${cf.name}...`}
                        style={{
                          textTransform:
                            cf.textCasing === 'uppercase'
                              ? 'uppercase'
                              : cf.textCasing === 'lowercase'
                                ? 'lowercase'
                                : 'none',
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleManualAdd()
                        }}
                        onChange={(e) => handleCustomFieldChange(cf.id, e.target.value)}
                        className={`w-full h-10 bg-surface-container-low px-3 rounded-DEFAULT text-body-sm text-on-surface focus:outline-none border transition-all ${
                          isMissing ? 'border-error focus:ring-1 focus:ring-error' : 'border-outline-variant/40 focus:border-primary focus:ring-1 focus:ring-primary'
                        }`}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Row 5: Action & Item Live Total Bar */}
        <div className="pt-3 border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-on-surface-variant font-mono-numeric-sm flex-wrap">
            <span className="font-bold text-on-surface text-sm">
              Item Total: ₹{itemCalculatedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-on-surface-variant/40">•</span>
            <span>Rate: ₹{(customPrice || 0).toFixed(2)} × {quantity}</span>
            {itemTaxVal > 0 && (
              <>
                <span className="text-on-surface-variant/40">•</span>
                <span className="text-secondary font-medium">GST (+₹{itemTaxVal.toFixed(2)})</span>
              </>
            )}
            {itemDiscountVal > 0 && (
              <>
                <span className="text-on-surface-variant/40">•</span>
                <span className="text-emerald-600 font-medium">Disc (-₹{itemDiscountVal.toFixed(2)})</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleClearFields}
              className="px-3.5 h-10 rounded-DEFAULT bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface text-body-sm font-medium transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button
              id="add-to-bill-btn"
              type="button"
              onClick={handleManualAdd}
              className="flex-1 sm:flex-none px-6 h-10 bg-primary hover:bg-inverse-surface text-on-primary rounded-DEFAULT flex items-center justify-center gap-2 font-label-md text-label-md font-semibold transition-all shadow-sm active:scale-98 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Add to Bill</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
