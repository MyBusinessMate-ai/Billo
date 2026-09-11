import React, { useState, useEffect, useRef } from 'react'
import { usePOS } from '../../context/POSContext'

interface CategoryManagementDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export const CategoryManagementDrawer: React.FC<CategoryManagementDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const { categories, addCategory, addBulkCategories, deleteCategory, showToast } = usePOS()

  const [activeTab, setActiveTab] = useState<'single' | 'json' | 'list'>('single')
  const [singleCategoryName, setSingleCategoryName] = useState('')
  const [isSubmittingSingle, setIsSubmittingSingle] = useState(false)

  // JSON Import States
  const [jsonText, setJsonText] = useState('')
  const [parsedPreview, setParsedPreview] = useState<{
    validNames: string[]
    duplicateNames: string[]
    error: string | null
  }>({ validNames: [], duplicateNames: [], error: null })
  const [isImportingJson, setIsImportingJson] = useState(false)
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
        if (categoryToDelete) {
          setCategoryToDelete(null)
        } else if (isOpen) {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, categoryToDelete])

  // Parse JSON input whenever text changes
  useEffect(() => {
    if (!jsonText.trim()) {
      setParsedPreview({ validNames: [], duplicateNames: [], error: null })
      return
    }

    try {
      let parsed: any
      try {
        parsed = JSON.parse(jsonText)
      } catch (jsonErr: any) {
        // Attempt fallback for newline or comma-separated plain text
        const lines = jsonText
          .split(/[\n,]+/)
          .map((l) =>
            l
              .trim()
              .replace(/^["'\[\]{}]+|["'\[\]{}]+$/g, '')
              .trim()
          )
          .filter((l) => l.length > 0 && !l.startsWith('//') && !l.startsWith('#'))

        if (lines.length > 0 && !jsonText.includes('{') && !jsonText.includes(':')) {
          parsed = lines
        } else {
          throw jsonErr
        }
      }

      let extracted: string[] = []

      const extractFromObject = (obj: any): string | null => {
        if (!obj || typeof obj !== 'object') return null
        const candidateKeys = [
          'categoryName',
          'category_name',
          'CategoryName',
          'category',
          'Category',
          'name',
          'Name',
          'title',
          'Title',
          'label',
          'Label',
          'categoryTitle',
          'category_title',
          'Category Name',
        ]
        for (const k of candidateKeys) {
          if (typeof obj[k] === 'string' && obj[k].trim()) {
            return obj[k].trim()
          }
        }
        for (const val of Object.values(obj)) {
          if (typeof val === 'string' && val.trim()) {
            return val.trim()
          }
        }
        return null
      }

      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (typeof item === 'string' && item.trim()) {
            extracted.push(item.trim())
          } else if (typeof item === 'object' && item !== null) {
            const name = extractFromObject(item)
            if (name) extracted.push(name)
          }
        }
      } else if (typeof parsed === 'object' && parsed !== null) {
        const candidateList =
          parsed.categories ||
          parsed.items ||
          parsed.data ||
          parsed.categoryList ||
          parsed.list ||
          parsed.Categories ||
          parsed.Items
        if (Array.isArray(candidateList)) {
          for (const item of candidateList) {
            if (typeof item === 'string' && item.trim()) {
              extracted.push(item.trim())
            } else if (typeof item === 'object' && item !== null) {
              const name = extractFromObject(item)
              if (name) extracted.push(name)
            }
          }
        } else {
          const single = extractFromObject(parsed)
          if (single) {
            extracted.push(single)
          }
        }
      }

      // Deduplicate within the incoming batch
      const uniqueExtracted = Array.from(new Set(extracted))

      if (uniqueExtracted.length === 0) {
        setParsedPreview({
          validNames: [],
          duplicateNames: [],
          error:
            'No valid category names found in JSON. Format: ["Category1", "Category2"] or [{"categoryName": "..."}]',
        })
        return
      }

      const existingSet = new Set(categories.map((c) => c.categoryName.trim().toLowerCase()))
      const validNames: string[] = []
      const duplicateNames: string[] = []

      for (const name of uniqueExtracted) {
        if (existingSet.has(name.toLowerCase())) {
          duplicateNames.push(name)
        } else {
          validNames.push(name)
        }
      }

      setParsedPreview({
        validNames,
        duplicateNames,
        error: null,
      })
    } catch (err: any) {
      setParsedPreview({
        validNames: [],
        duplicateNames: [],
        error: `JSON syntax error: ${err.message}`,
      })
    }
  }, [jsonText, categories])

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

    setIsSubmittingSingle(true)
    try {
      await addCategory(trimmed)
      setSingleCategoryName('')
    } catch {
      // Handled in context
    } finally {
      setIsSubmittingSingle(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      showToast('Please upload a valid .json file', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setJsonText(content)
      setActiveTab('json')
      showToast(`Loaded "${file.name}" into preview`, 'info')
    }
    reader.onerror = () => {
      showToast('Failed to read file', 'error')
    }
    reader.readAsText(file)
  }

  const handleImportJson = async () => {
    if (parsedPreview.validNames.length === 0) {
      showToast('No new categories to import', 'warning')
      return
    }

    setIsImportingJson(true)
    try {
      await addBulkCategories(parsedPreview.validNames)
      setJsonText('')
      setParsedPreview({ validNames: [], duplicateNames: [], error: null })
      setActiveTab('list')
    } catch {
      // Handled in context
    } finally {
      setIsImportingJson(false)
    }
  }

  const handleDownloadSampleJson = () => {
    const sample = [
      { categoryName: 'Beverages & Drinks' },
      { categoryName: 'Bakery & Bread' },
      { categoryName: 'Dairy & Eggs' },
      { categoryName: 'Organic Snacks' },
      { categoryName: 'Personal Care & Hygiene' },
      { categoryName: 'Household Essentials' },
    ]
    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sample-categories-template.json'
    a.click()
    URL.revokeObjectURL(url)
    showToast('Downloaded sample JSON template', 'success')
  }

  const handleExportCurrentCategories = () => {
    const exportData = categories.map((c) => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName,
    }))
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `business-categories-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast(`Exported ${categories.length} categories to JSON`, 'success')
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
            Add categories individually or batch-import from JSON to feed multiple business
            catalogs.
          </p>

          {/* Quick Stats & Export Bar */}
          <div className="flex items-center justify-between pt-1">
            <span className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">
              Current Categories ({categories.length})
            </span>
            <button
              type="button"
              onClick={handleExportCurrentCategories}
              className="flex items-center gap-1 text-[11px] text-primary hover:underline font-semibold cursor-pointer"
              title="Export all categories as JSON file"
            >
              <span className="material-symbols-outlined text-[14px]">download</span>
              <span>Export JSON</span>
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
            onClick={() => setActiveTab('json')}
            className={`pb-2 px-2 flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'json'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">data_object</span>
            <span>Import JSON</span>
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

        {/* Drawer Body Area */}
        <div className="flex-1 overflow-y-auto p-pad-lg flex flex-col gap-pad-md">
          {/* TAB 1: ADD SINGLE CATEGORY */}
          {activeTab === 'single' && (
            <div className="flex flex-col gap-pad-md">
              <form onSubmit={handleAddSingle} className="flex flex-col gap-3">
                <label className="block font-label-sm text-label-sm font-semibold text-on-surface">
                  Create New Category
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={singleCategoryName}
                    onChange={(e) => setSingleCategoryName(e.target.value)}
                    placeholder="e.g. Beverages, Bakery, Cosmetics, Organic Groceries..."
                    autoFocus
                    disabled={isSubmittingSingle}
                    className="flex-1 p-2.5 bg-surface-container-lowest border border-outline-variant/60 rounded-DEFAULT text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingSingle || !singleCategoryName.trim()}
                    className="px-4 bg-primary text-on-primary hover:bg-inverse-surface disabled:opacity-50 font-label-md text-label-md font-semibold rounded-DEFAULT transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    <span>{isSubmittingSingle ? 'Adding...' : 'Add'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Press Enter to immediately save. The category will instantly be accessible in POS
                  billing and the product catalogue.
                </p>
              </form>

              {/* Quick Jump to JSON Feed */}
              <div className="p-3 bg-surface-container-low rounded-DEFAULT border border-outline-variant/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-secondary text-[20px]">
                    upload_file
                  </span>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-xs font-semibold text-on-surface">
                      Have multiple business categories in JSON?
                    </span>
                    <span className="text-[11px] text-on-surface-variant">
                      Upload or paste a JSON array to feed all at once.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('json')}
                  className="px-2.5 py-1 text-xs bg-surface-container hover:bg-surface-container-high rounded font-semibold text-primary transition-colors cursor-pointer shrink-0"
                >
                  Import JSON
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT VIA JSON */}
          {activeTab === 'json' && (
            <div className="flex flex-col gap-pad-md">
              <div className="flex items-center justify-between">
                <label className="block font-label-sm text-label-sm font-semibold text-on-surface">
                  JSON Data Feed & File Import
                </label>
                <button
                  type="button"
                  onClick={handleDownloadSampleJson}
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
                  accept=".json,application/json"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-3 border-2 border-dashed border-outline-variant/60 hover:border-primary/60 rounded-DEFAULT bg-surface-container-low hover:bg-surface-container flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[24px] text-primary">
                    file_upload
                  </span>
                  <span className="font-label-sm text-xs font-semibold text-on-surface">
                    Upload .JSON File
                  </span>
                  <span className="text-[11px] text-on-surface-variant">
                    Click to select file from your computer
                  </span>
                </button>
              </div>

              {/* Or Paste Raw JSON Text */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                    Or Paste JSON Directly:
                  </span>
                  {jsonText && (
                    <button
                      type="button"
                      onClick={() => setJsonText('')}
                      className="text-[11px] text-error hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <textarea
                  rows={6}
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder={`[\n  {\n    "categoryName": "Beverages & Drinks"\n  },\n  {\n    "categoryName": "Bakery & Bread"\n  }\n]`}
                  className="w-full p-2.5 font-mono text-xs bg-surface-container-lowest border border-outline-variant/60 rounded-DEFAULT text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs leading-relaxed"
                />
              </div>

              {/* JSON Parse / Action Button */}
              {jsonText.trim() && (
                <div className="flex flex-col gap-2">
                  {parsedPreview.error ? (
                    <div className="p-2.5 bg-error-container/20 border border-error/30 rounded-DEFAULT flex items-center gap-2 text-error text-xs">
                      <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                      <span className="leading-tight">{parsedPreview.error}</span>
                    </div>
                  ) : parsedPreview.validNames.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={handleImportJson}
                        disabled={isImportingJson}
                        className="w-full py-2.5 bg-primary text-on-primary hover:bg-inverse-surface disabled:opacity-50 rounded-DEFAULT font-semibold text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">save_alt</span>
                        <span>
                          {isImportingJson
                            ? 'Importing...'
                            : `Import ${parsedPreview.validNames.length} ${
                                parsedPreview.validNames.length === 1 ? 'Category' : 'Categories'
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
                      <th className="py-2 px-2.5 w-10 text-center">S.No.</th>
                      <th className="py-2 px-2.5 w-24">ID</th>
                      <th className="py-2 px-3">Category Name</th>
                      <th className="py-2 px-2.5 text-right w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20">
                    {filteredCategories.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-6 text-center text-on-surface-variant text-xs"
                        >
                          {searchQuery
                            ? `No categories match "${searchQuery}"`
                            : 'No categories created yet.'}
                        </td>
                      </tr>
                    ) : (
                      filteredCategories.map((cat, idx) => (
                        <tr
                          key={cat.categoryId}
                          className="hover:bg-surface-container-low transition-colors"
                        >
                          <td className="py-2 px-2.5 text-center text-on-surface-variant font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-2.5 font-mono text-[10px] text-on-surface-variant">
                            {cat.categoryId}
                          </td>
                          <td className="py-2 px-3 font-semibold text-on-surface">
                            {cat.categoryName}
                          </td>
                          <td className="py-2 px-2.5 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setCategoryToDelete({ id: cat.categoryId, name: cat.categoryName })
                              }
                              className="p-1 text-on-surface-variant hover:text-error hover:bg-error-container/20 rounded transition-colors cursor-pointer"
                              title="Delete category"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </td>
                        </tr>
                      ))
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
