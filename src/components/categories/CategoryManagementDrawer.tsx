import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { usePOS } from '../../context/POSContext'

interface CategoryManagementDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export const CategoryManagementDrawer: React.FC<CategoryManagementDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate()
  const { categories, addCategory, updateCategory, addBulkCategories, deleteCategory, showToast } =
    usePOS()

  const [activeTab, setActiveTab] = useState<'single' | 'csv' | 'list'>('single')
  const [singleCategoryName, setSingleCategoryName] = useState('')
  const [singleBasePrice, setSingleBasePrice] = useState('')
  const [copyFromCatId, setCopyFromCatId] = useState('')
  const [isSubmittingSingle, setIsSubmittingSingle] = useState(false)

  // Inline Table Edit States
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editCategoryName, setEditCategoryName] = useState('')
  const [editBasePrice, setEditBasePrice] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  // CSV Import States
  const [csvText, setCsvText] = useState('')
  const [parsedPreview, setParsedPreview] = useState<{
    validItems: Array<{ categoryName: string; basePrice?: number }>
    duplicateNames: string[]
    error: string | null
  }>({ validItems: [], duplicateNames: [], error: null })
  const [isImportingCsv, setIsImportingCsv] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('')

  // Delete Confirmation Popup State
  const [categoryToDelete, setCategoryToDelete] = useState<{
    id: string
    name: string
  } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingCategoryId) {
          setEditingCategoryId(null)
        } else if (categoryToDelete) {
          setCategoryToDelete(null)
        } else if (isOpen) {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, categoryToDelete, editingCategoryId])

  // Parse CSV input whenever text changes
  useEffect(() => {
    if (!csvText.trim()) {
      setParsedPreview({ validItems: [], duplicateNames: [], error: null })
      return
    }

    try {
      // Split into lines
      const rawLines = csvText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('//'))

      if (rawLines.length === 0) {
        setParsedPreview({ validItems: [], duplicateNames: [], error: 'No content found in CSV.' })
        return
      }

      // Helper to parse individual CSV line handling quotes and delimiters (comma, semicolon, tab)
      const parseCSVLine = (line: string): string[] => {
        const delimiter = line.includes('\t')
          ? '\t'
          : line.includes(';') && !line.includes(',')
            ? ';'
            : ','
        const cells: string[] = []
        let cur = ''
        let inQuotes = false

        for (let i = 0; i < line.length; i++) {
          const char = line[i]
          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
              cur += '"'
              i++ // skip escaped quote
            } else {
              inQuotes = !inQuotes
            }
          } else if (char === delimiter && !inQuotes) {
            cells.push(cur.trim())
            cur = ''
          } else {
            cur += char
          }
        }
        cells.push(cur.trim())
        return cells.map((c) => c.replace(/^["']+|["']+$/g, '').trim())
      }

      const rows = rawLines
        .map(parseCSVLine)
        .filter((r) => r.length > 0 && r.some((c) => c.length > 0))

      if (rows.length === 0) {
        setParsedPreview({
          validItems: [],
          duplicateNames: [],
          error: 'No valid rows found in CSV.',
        })
        return
      }

      // Check if first row is a header
      const firstRow = rows[0]
      const isHeaderRow = firstRow.some((col) => {
        const lower = col.toLowerCase()
        return (
          lower.includes('category') ||
          lower.includes('name') ||
          lower.includes('item') ||
          lower.includes('title') ||
          lower.includes('price') ||
          lower.includes('rate')
        )
      })

      let nameColIdx = 0
      let priceColIdx = 1

      if (isHeaderRow) {
        firstRow.forEach((col, idx) => {
          const lower = col.toLowerCase()
          if (
            lower.includes('category_name') ||
            lower.includes('categoryname') ||
            lower.includes('category name') ||
            lower.includes('category') ||
            lower.includes('name') ||
            lower.includes('title')
          ) {
            if (lower !== 'category id' && lower !== 'category_id' && lower !== 'cat_id') {
              nameColIdx = idx
            }
          }
          if (
            lower.includes('base_price') ||
            lower.includes('baseprice') ||
            lower.includes('base price') ||
            lower.includes('price') ||
            lower.includes('rate')
          ) {
            priceColIdx = idx
          }
        })
      }

      const dataRows = isHeaderRow ? rows.slice(1) : rows
      const extracted: Array<{ categoryName: string; basePrice?: number }> = []

      for (const row of dataRows) {
        const catName = row[nameColIdx] ? row[nameColIdx].trim() : ''
        if (!catName) continue

        let basePrice: number | undefined
        const rawPriceStr = row[priceColIdx] ? row[priceColIdx].replace(/[₹$,]/g, '').trim() : ''
        if (rawPriceStr !== '') {
          const parsed = parseFloat(rawPriceStr)
          if (!isNaN(parsed) && parsed >= 0) {
            basePrice = parsed
          }
        }

        extracted.push({ categoryName: catName, basePrice })
      }

      // Deduplicate within the incoming batch
      const seenNames = new Set<string>()
      const uniqueExtracted: Array<{ categoryName: string; basePrice?: number }> = []
      for (const item of extracted) {
        const lower = item.categoryName.toLowerCase()
        if (!seenNames.has(lower)) {
          seenNames.add(lower)
          uniqueExtracted.push(item)
        }
      }

      if (uniqueExtracted.length === 0) {
        setParsedPreview({
          validItems: [],
          duplicateNames: [],
          error:
            'No valid category names found in CSV. Expected format: Category Name, Base Price (e.g. "Beverages, 120")',
        })
        return
      }

      const existingSet = new Set(categories.map((c) => c.categoryName.trim().toLowerCase()))
      const validItems: Array<{ categoryName: string; basePrice?: number }> = []
      const duplicateNames: string[] = []

      for (const item of uniqueExtracted) {
        if (existingSet.has(item.categoryName.toLowerCase())) {
          duplicateNames.push(item.categoryName)
        } else {
          validItems.push(item)
        }
      }

      setParsedPreview({
        validItems,
        duplicateNames,
        error: null,
      })
    } catch (err: any) {
      setParsedPreview({
        validItems: [],
        duplicateNames: [],
        error: `CSV parsing error: ${err.message}`,
      })
    }
  }, [csvText, categories])

  if (!isOpen) return null

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = singleCategoryName.trim()
    if (!trimmed) {
      showToast('Please enter a category name', 'warning')
      return
    }

    if (categories.some((c) => c.categoryName.toLowerCase() === trimmed.toLowerCase())) {
      showToast(`Category "${trimmed}" already exists`, 'warning')
      return
    }

    const parsedPrice = singleBasePrice.trim() !== '' ? parseFloat(singleBasePrice) : undefined
    const validPrice =
      typeof parsedPrice === 'number' && !isNaN(parsedPrice) && parsedPrice >= 0
        ? parsedPrice
        : undefined

    setIsSubmittingSingle(true)
    try {
      let extraData: any = undefined
      if (copyFromCatId) {
        const source = categories.find((c) => c.categoryId === copyFromCatId)
        if (source) {
          extraData = {
            defaultFieldsConfig: source.defaultFieldsConfig
              ? JSON.parse(JSON.stringify(source.defaultFieldsConfig))
              : undefined,
            customFields: source.customFields
              ? JSON.parse(JSON.stringify(source.customFields))
              : undefined,
          }
        }
      }
      await addCategory(trimmed, validPrice, extraData)
      setSingleCategoryName('')
      setSingleBasePrice('')
      setCopyFromCatId('')
    } catch {
      // Handled in context
    } finally {
      setIsSubmittingSingle(false)
    }
  }

  const handleStartEdit = (cat: {
    categoryId: string
    categoryName: string
    basePrice?: number
  }) => {
    setEditingCategoryId(cat.categoryId)
    setEditCategoryName(cat.categoryName)
    setEditBasePrice(cat.basePrice !== undefined && cat.basePrice > 0 ? String(cat.basePrice) : '')
  }

  const handleSaveEdit = async (catId: string) => {
    const trimmed = editCategoryName.trim()
    if (!trimmed) {
      showToast('Category name cannot be empty', 'warning')
      return
    }

    const parsedPrice = editBasePrice.trim() !== '' ? parseFloat(editBasePrice) : undefined
    const validPrice =
      typeof parsedPrice === 'number' && !isNaN(parsedPrice) && parsedPrice >= 0
        ? parsedPrice
        : undefined

    setIsSavingEdit(true)
    try {
      await updateCategory(catId, {
        categoryName: trimmed,
        basePrice: validPrice,
      })
      setEditingCategoryId(null)
    } catch {
      // Handled in context
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      showToast('Please upload a valid .csv file', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setCsvText(content)
      setActiveTab('csv')
      showToast(`Loaded "${file.name}" into preview`, 'info')
    }
    reader.onerror = () => {
      showToast('Failed to read file', 'error')
    }
    reader.readAsText(file)
  }

  const handleImportCsv = async () => {
    if (parsedPreview.validItems.length === 0) {
      showToast('No new categories to import', 'warning')
      return
    }

    setIsImportingCsv(true)
    try {
      await addBulkCategories(parsedPreview.validItems)
      setCsvText('')
      setParsedPreview({ validItems: [], duplicateNames: [], error: null })
      setActiveTab('list')
    } catch {
      // Handled in context
    } finally {
      setIsImportingCsv(false)
    }
  }

  const handleDownloadSampleCsv = () => {
    const sampleHeaders = ['Category Name', 'Base Price']
    const sampleRows = [
      ['Beverages & Drinks', '120'],
      ['Bakery & Bread', '65'],
      ['Dairy & Eggs', '85'],
      ['Organic Snacks', '150'],
      ['Personal Care & Hygiene', ''],
      ['Household Essentials', ''],
    ]
    const csvContent = [
      sampleHeaders.join(','),
      ...sampleRows.map((r) => `"${r[0].replace(/"/g, '""')}",${r[1]}`),
    ].join('\r\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sample-categories-template.csv'
    a.click()
    URL.revokeObjectURL(url)
    showToast('Downloaded sample CSV template', 'success')
  }

  const handleExportCurrentCategoriesCsv = () => {
    if (categories.length === 0) {
      showToast('No categories to export', 'info')
      return
    }
    const headers = ['Category ID', 'Category Name', 'Base Price']
    const rows = categories.map((c) => [
      `"${c.categoryId}"`,
      `"${c.categoryName.replace(/"/g, '""')}"`,
      typeof c.basePrice === 'number' && c.basePrice > 0 ? c.basePrice : '',
    ])
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `business-categories-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast(`Exported ${categories.length} categories to CSV`, 'success')
  }

  const filteredCategories = categories.filter((cat) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return cat.categoryName.toLowerCase().includes(q) || cat.categoryId.toLowerCase().includes(q)
  })

  return (
    <>
      {/* Background Dim / Scrim */}
      <div
        className="fixed inset-0 bg-inverse-surface/40 z-50 transition-opacity duration-300 backdrop-blur-2xs"
        onClick={onClose}
      />

      {/* Right Drawer Panel (Width: 500px) */}
      <aside className="fixed top-0 right-0 bottom-0 w-full max-w-[500px] bg-surface-container-lowest shadow-2xl z-50 flex flex-col justify-between overflow-hidden border-l border-outline-variant/40 animate-slide-drawer">
        {/* Drawer Header */}
        <div className="px-pad-lg py-pad-md bg-surface-container-low border-b border-outline-variant/30 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">category</span>
              <span className="font-headline-sm text-headline-sm text-on-surface">
                Category Management
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-DEFAULT transition-colors cursor-pointer"
              title="Close panel"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <p className="font-body-sm text-[12px] text-on-surface-variant leading-tight">
            Add categories individually or batch-import from CSV to feed multiple business catalogs.
          </p>

          {/* Quick Stats & Export Bar */}
          <div className="flex items-center justify-between pt-1">
            <span className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">
              Current Categories ({categories.length})
            </span>
            <button
              type="button"
              onClick={handleExportCurrentCategoriesCsv}
              className="flex items-center gap-1 text-[11px] text-primary hover:underline font-semibold cursor-pointer"
              title="Export all categories as CSV file"
            >
              <span className="material-symbols-outlined text-[14px]">download</span>
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-outline-variant/30 bg-surface-container-lowest px-pad-lg pt-2 gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('single')}
            className={`pb-2 px-2 flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'single'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            <span>Add Single</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('csv')}
            className={`pb-2 px-2 flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'csv'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">table_view</span>
            <span>Import CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`pb-2 px-2 flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'list'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">list</span>
            <span>Category Table ({categories.length})</span>
          </button>
        </div>

        {/* Setup & Dynamic Fields Integration Banner */}
        <div className="px-pad-lg pt-3">
          <button
            type="button"
            onClick={() => {
              onClose()
              navigate({ to: '/setup' })
            }}
            className="w-full py-2 px-3 bg-primary/10 hover:bg-primary/15 text-primary rounded-DEFAULT text-xs font-semibold flex items-center justify-between transition-all cursor-pointer border border-primary/20 group"
          >
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">dynamic_form</span>
              <span>Advanced: Configure Category Fields & Columns in /setup</span>
            </div>
            <span className="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 transition-transform">
              arrow_forward
            </span>
          </button>
        </div>

        {/* Drawer Body Area */}
        <div className="flex-1 overflow-y-auto p-pad-lg flex flex-col gap-pad-md">
          {/* TAB 1: ADD SINGLE CATEGORY */}
          {activeTab === 'single' && (
            <div className="flex flex-col gap-pad-md">
              <form onSubmit={handleAddSingle} className="flex flex-col gap-3">
                <label className="block font-label-sm text-label-sm font-semibold text-on-surface">
                  Create New Category
                </label>
                <div className="flex flex-col gap-2.5">
                  <div>
                    <label className="block text-[11px] text-on-surface-variant font-medium mb-1">
                      Category Name <span className="text-error">*</span>
                    </label>
                    <input
                      type="text"
                      value={singleCategoryName}
                      onChange={(e) => setSingleCategoryName(e.target.value)}
                      placeholder="e.g. Beverages, Bakery, Cosmetics, Bangles..."
                      autoFocus
                      disabled={isSubmittingSingle}
                      className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant/60 rounded-DEFAULT text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-on-surface-variant font-medium mb-1">
                      Base Price (₹){' '}
                      <span className="text-on-surface-variant/60 font-normal">
                        (Optional default price during billing)
                      </span>
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 font-mono text-xs text-on-surface-variant">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={singleBasePrice}
                        onChange={(e) => setSingleBasePrice(e.target.value)}
                        placeholder="0.00 (Leave empty if dynamic)"
                        disabled={isSubmittingSingle}
                        className="w-full pl-6 pr-3 py-2 bg-surface-container-lowest border border-outline-variant/60 rounded-DEFAULT font-mono-numeric-sm text-xs text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs"
                      />
                    </div>
                  </div>

                  {categories.length > 0 && (
                    <div>
                      <label className="block text-[11px] text-on-surface-variant font-medium mb-1">
                        Inherit / Copy Fields From (Optional)
                      </label>
                      <select
                        value={copyFromCatId}
                        onChange={(e) => setCopyFromCatId(e.target.value)}
                        className="w-full p-2 bg-surface-container-lowest border border-outline-variant/60 rounded-DEFAULT text-xs text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs cursor-pointer"
                      >
                        <option value="">Start with Standard 7 Default Fields</option>
                        {categories.map((c) => (
                          <option key={c.categoryId} value={c.categoryId}>
                            Copy from {c.categoryName} ({c.customFields?.length || 0} fields)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmittingSingle || !singleCategoryName.trim()}
                    className="w-full py-2.5 bg-primary text-on-primary hover:bg-inverse-surface disabled:opacity-50 font-label-md text-label-md font-semibold rounded-DEFAULT transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_circle</span>
                    <span>{isSubmittingSingle ? 'Adding Category...' : 'Add Category'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  The base price automatically pre-fills the item price when selected in billing.
                  Cashiers can still adjust it per customer without affecting the saved base price.
                </p>
              </form>

              {/* Quick Jump to CSV Feed */}
              <div className="p-3 bg-surface-container-low rounded-DEFAULT border border-outline-variant/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-secondary text-[20px]">
                    table_view
                  </span>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-xs font-semibold text-on-surface">
                      Have multiple business categories in CSV?
                    </span>
                    <span className="text-[11px] text-on-surface-variant">
                      Upload or paste CSV rows to import all at once.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('csv')}
                  className="px-2.5 py-1 text-xs bg-surface-container hover:bg-surface-container-high rounded font-semibold text-primary transition-colors cursor-pointer shrink-0"
                >
                  Import CSV
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT VIA CSV */}
          {activeTab === 'csv' && (
            <div className="flex flex-col gap-pad-md">
              <div className="flex items-center justify-between">
                <label className="block font-label-sm text-label-sm font-semibold text-on-surface">
                  CSV Data Feed & File Import
                </label>
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">file_download</span>
                  <span>Sample Template</span>
                </button>
              </div>

              {/* File Upload Trigger */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv,text/csv"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-3 border-2 border-dashed border-outline-variant/60 hover:border-primary/60 rounded-DEFAULT bg-surface-container-low hover:bg-surface-container flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[24px] text-primary">
                    upload_file
                  </span>
                  <span className="font-label-sm text-xs font-semibold text-on-surface">
                    Upload .CSV File
                  </span>
                  <span className="text-[11px] text-on-surface-variant">
                    Click to select a CSV file from your computer
                  </span>
                </button>
              </div>

              {/* Or Paste Raw CSV Text */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                    Or Paste CSV Directly:
                  </span>
                  {csvText && (
                    <button
                      type="button"
                      onClick={() => setCsvText('')}
                      className="text-[11px] text-error hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <textarea
                  rows={6}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={`Category Name, Base Price\nBeverages & Drinks, 120\nBakery & Bread, 65\nDairy & Eggs, 85\nOrganic Snacks, 150`}
                  className="w-full p-2.5 font-mono text-xs bg-surface-container-lowest border border-outline-variant/60 rounded-DEFAULT text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs leading-relaxed"
                />
              </div>

              {/* CSV Parse / Action Button */}
              {csvText.trim() && (
                <div className="flex flex-col gap-2">
                  {parsedPreview.error ? (
                    <div className="p-2.5 bg-error-container/20 border border-error/30 rounded-DEFAULT flex items-center gap-2 text-error text-xs">
                      <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                      <span className="leading-tight">{parsedPreview.error}</span>
                    </div>
                  ) : parsedPreview.validItems.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={handleImportCsv}
                        disabled={isImportingCsv}
                        className="w-full py-2.5 bg-primary text-on-primary hover:bg-inverse-surface disabled:opacity-50 rounded-DEFAULT font-semibold text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">save_alt</span>
                        <span>
                          {isImportingCsv
                            ? 'Importing...'
                            : `Import ${parsedPreview.validItems.length} ${
                                parsedPreview.validItems.length === 1 ? 'Category' : 'Categories'
                              }`}
                        </span>
                      </button>
                      {parsedPreview.duplicateNames.length > 0 && (
                        <p className="text-[11px] text-center text-on-surface-variant font-medium">
                          ({parsedPreview.duplicateNames.length} already exist in database and will
                          be skipped)
                        </p>
                      )}
                    </div>
                  ) : parsedPreview.duplicateNames.length > 0 ? (
                    <div className="p-3 bg-secondary/10 border border-secondary/30 rounded-DEFAULT flex flex-col gap-2 text-xs">
                      <div className="flex items-center justify-between text-secondary">
                        <span className="flex items-center gap-1.5 font-semibold">
                          <span className="material-symbols-outlined text-[18px]">
                            check_circle
                          </span>
                          <span>
                            All {parsedPreview.duplicateNames.length}{' '}
                            {parsedPreview.duplicateNames.length === 1 ? 'category' : 'categories'}{' '}
                            already exist in database
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveTab('list')}
                          className="text-[11px] text-primary hover:underline font-semibold cursor-pointer flex items-center gap-0.5 shrink-0"
                        >
                          <span>View in List</span>
                          <span className="material-symbols-outlined text-[14px]">
                            arrow_forward
                          </span>
                        </button>
                      </div>
                      <p className="text-[11px] text-on-surface-variant line-clamp-2">
                        {parsedPreview.duplicateNames.join(', ')}
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CATEGORY TABLE / LIST */}
          {activeTab === 'list' && (
            <div className="flex flex-col gap-pad-sm">
              {/* Search Bar */}
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] leading-none text-on-surface-variant pointer-events-none select-none flex items-center justify-center">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search categories by name or ID..."
                  className="w-full pl-8.5 pr-8 py-2 bg-surface-container-lowest border border-outline-variant/60 rounded-DEFAULT text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1 rounded cursor-pointer flex items-center justify-center"
                    title="Clear search"
                  >
                    <span className="material-symbols-outlined text-[15px]">close</span>
                  </button>
                )}
              </div>

              {/* Table Container */}
              <div className="border border-outline-variant/40 rounded-DEFAULT overflow-hidden bg-surface-container-lowest">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant/30 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                      <th className="py-2 px-2 text-center w-8">#</th>
                      <th className="py-2 px-2 w-20">ID</th>
                      <th className="py-2 px-2.5">Category Name</th>
                      <th className="py-2 px-2.5 text-right w-24">Base Price</th>
                      <th className="py-2 px-2 text-right w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20">
                    {filteredCategories.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-6 text-center text-on-surface-variant text-xs"
                        >
                          {searchQuery
                            ? `No categories match "${searchQuery}"`
                            : 'No categories created yet.'}
                        </td>
                      </tr>
                    ) : (
                      filteredCategories.map((cat, idx) => {
                        const isEditing = editingCategoryId === cat.categoryId
                        return (
                          <tr
                            key={cat.categoryId}
                            className={`hover:bg-surface-container-low transition-colors ${
                              isEditing ? 'bg-primary/5' : ''
                            }`}
                          >
                            <td className="py-2 px-2 text-center text-on-surface-variant font-mono text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-2 font-mono text-[10px] text-on-surface-variant">
                              {cat.categoryId}
                            </td>
                            <td className="py-2 px-2.5 font-semibold text-on-surface">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editCategoryName}
                                  onChange={(e) => setEditCategoryName(e.target.value)}
                                  className="w-full px-2 py-1 bg-surface-container-lowest border border-primary rounded text-xs text-on-surface focus:outline-none"
                                  autoFocus
                                />
                              ) : (
                                cat.categoryName
                              )}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono text-[11px]">
                              {isEditing ? (
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  placeholder="0.00"
                                  value={editBasePrice}
                                  onChange={(e) => setEditBasePrice(e.target.value)}
                                  className="w-20 px-1.5 py-1 bg-surface-container-lowest border border-primary rounded text-xs text-right text-on-surface focus:outline-none font-mono"
                                />
                              ) : typeof cat.basePrice === 'number' && cat.basePrice > 0 ? (
                                <span className="font-semibold text-secondary">
                                  ₹{cat.basePrice.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-on-surface-variant/40 italic">—</span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-right">
                              {isEditing ? (
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEdit(cat.categoryId)}
                                    disabled={isSavingEdit}
                                    className="p-1 text-secondary hover:bg-secondary/15 rounded cursor-pointer transition-colors"
                                    title="Save changes"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">
                                      check
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingCategoryId(null)}
                                    disabled={isSavingEdit}
                                    className="p-1 text-on-surface-variant hover:bg-surface-container rounded cursor-pointer transition-colors"
                                    title="Cancel"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">
                                      close
                                    </span>
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(cat)}
                                    className="p-1 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded transition-colors cursor-pointer"
                                    title="Edit category & base price"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">
                                      edit
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCategoryToDelete({
                                        id: cat.categoryId,
                                        name: cat.categoryName,
                                      })
                                    }
                                    className="p-1 text-on-surface-variant hover:text-error hover:bg-error-container/20 rounded transition-colors cursor-pointer"
                                    title="Delete category"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">
                                      delete
                                    </span>
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-pad-md bg-surface-container-low border-t border-outline-variant/30 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono-numeric-sm text-[11px] text-on-surface-variant">
              {categories.length} Total Categories
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-DEFAULT font-semibold text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </aside>

      {/* Custom Confirmation Popup Panel for Deletion */}
      {categoryToDelete && (
        <div
          className="fixed inset-0 z-60 bg-inverse-surface/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) {
              setCategoryToDelete(null)
            }
          }}
        >
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-DEFAULT shadow-2xl p-pad-lg max-w-sm w-full flex flex-col gap-pad-md animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-error-container/40 text-error flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">delete_forever</span>
              </div>
              <div className="flex flex-col min-w-0">
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Delete Category?
                </h3>
                <p className="font-body-sm text-[12px] text-on-surface-variant truncate">
                  {categoryToDelete.name} ({categoryToDelete.id})
                </p>
              </div>
            </div>

            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              Are you sure you want to remove{' '}
              <strong className="text-on-surface font-semibold">"{categoryToDelete.name}"</strong>?
              Products in this category will need to be re-assigned.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-DEFAULT font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!categoryToDelete) return
                  setIsDeleting(true)
                  try {
                    await deleteCategory(categoryToDelete.id)
                    setCategoryToDelete(null)
                  } catch {
                    // Handled in context
                  } finally {
                    setIsDeleting(false)
                  }
                }}
                disabled={isDeleting}
                className="px-4 py-1.5 bg-error text-on-error hover:bg-error/90 disabled:opacity-50 rounded-DEFAULT font-semibold text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>{isDeleting ? 'Deleting...' : 'Delete Category'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
