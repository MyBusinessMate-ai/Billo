import React, { useState, useEffect, useRef, useMemo } from 'react'
import type { Product, StockStatus } from '../../types/pos'
import { usePOS } from '../../context/POSContext'

interface InventoryTableProps {
  onEditProduct?: (product: Product) => void
}

export const InventoryTable: React.FC<InventoryTableProps> = ({ onEditProduct }) => {
  const { products, quickRestockProduct, categories } = usePOS()
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | StockStatus>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('All')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 10

  // Keyboard shortcut Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const availableCategories = useMemo(() => {
    const fromCategories = categories.map((c) => c.categoryName)
    const fromProducts = products.map((p) => p.category).filter(Boolean)
    const set = new Set([...fromCategories, ...fromProducts])
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [categories, products])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: products.length,
    }
    availableCategories.forEach((cat) => {
      counts[cat] = products.filter((p) => p.category === cat).length
    })
    return counts
  }, [products, availableCategories])

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.ean.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' ? true : p.status === statusFilter
    const matchesCategory = categoryFilter === 'All' ? true : p.category === categoryFilter

    return matchesSearch && matchesStatus && matchesCategory
  })

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / rowsPerPage) || 1
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  )

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedProducts.map((p) => p.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Dairy':
        return 'egg'
      case 'Bakery':
        return 'bakery_dining'
      case 'Beverages':
        return 'local_cafe'
      case 'Produce':
        return 'nutrition'
      default:
        return 'inventory_2'
    }
  }

  const renderStockStatusBadge = (product: Product) => {
    if (product.status === 'out_of_stock' || product.stock === 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-DEFAULT bg-error-container text-error font-label-sm text-[11px] border border-error/30">
          <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
          Out of Stock
        </span>
      )
    }

    if (product.status === 'low_stock' || product.stock < 10) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-DEFAULT bg-error-container/40 text-on-tertiary-container font-label-sm text-[11px] border border-outline-variant/40">
          <span className="w-1.5 h-1.5 rounded-full bg-on-tertiary-container"></span>
          Low Stock ({product.stock} left)
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-DEFAULT bg-surface-container text-on-surface font-label-sm text-[11px]">
        <span className="w-1.5 h-1.5 rounded-full bg-outline"></span>
        In Stock
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-pad-md">
      {/* Filters, Search & View Controllers */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-DEFAULT p-pad-sm flex flex-col gap-pad-sm">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-pad-sm">
          {/* Search Field */}
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-[16px] text-on-surface-variant">
              search
            </span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchQuery('')
                  searchInputRef.current?.blur()
                }
              }}
              placeholder="Search by Product Name, SKU, or Barcode..."
              className="w-full h-button-sm pl-8 pr-16 bg-surface-container-low border border-outline-variant/40 rounded-DEFAULT font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none"
            />
            <div className="absolute right-2.5 top-2 flex items-center gap-1">
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono-numeric-sm font-semibold text-on-surface-variant bg-surface-container rounded border border-outline-variant/50 leading-none">
                Ctrl + K
              </kbd>
            </div>
          </div>

          {/* Stock Status Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            <span className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold mr-1">
              Status:
            </span>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all')
                setCurrentPage(1)
              }}
              className={`h-7 px-2.5 rounded-DEFAULT font-label-sm text-[11px] font-medium transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
              }`}
            >
              All Stock
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('in_stock')
                setCurrentPage(1)
              }}
              className={`h-7 px-2.5 rounded-DEFAULT font-label-sm text-[11px] font-medium transition-colors cursor-pointer ${
                statusFilter === 'in_stock'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
              }`}
            >
              In Stock
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('low_stock')
                setCurrentPage(1)
              }}
              className={`h-7 px-2.5 rounded-DEFAULT font-label-sm text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                statusFilter === 'low_stock'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-on-tertiary-container"></span>
              Low Stock (&lt;10)
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('out_of_stock')
                setCurrentPage(1)
              }}
              className={`h-7 px-2.5 rounded-DEFAULT font-label-sm text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                statusFilter === 'out_of_stock'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
              Out of Stock
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="pt-pad-xs border-t border-outline-variant/20 flex items-center gap-1.5 overflow-x-auto text-nowrap">
          <span className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold mr-1">
            Category:
          </span>
          {Object.entries(categoryCounts).map(([catName, count]) => (
            <button
              key={catName}
              type="button"
              onClick={() => {
                setCategoryFilter(catName)
                setCurrentPage(1)
              }}
              className={`h-6 px-2 rounded-DEFAULT font-label-sm text-[11px] transition-colors cursor-pointer ${
                categoryFilter === catName
                  ? 'bg-surface-container-high text-on-surface font-semibold'
                  : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
              }`}
            >
              {catName} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Data Grid Container */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-DEFAULT overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="h-row-h-dense bg-surface-container-low border-b border-outline-variant/30">
                <th className="w-10 px-pad-sm text-center">
                  <input
                    type="checkbox"
                    checked={
                      paginatedProducts.length > 0 &&
                      selectedIds.length === paginatedProducts.length
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded-DEFAULT border-outline text-primary focus:ring-0 focus:outline-none cursor-pointer"
                  />
                </th>
                <th className="px-pad-sm font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">
                  Product & SKU
                </th>
                <th className="px-pad-sm font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">
                  Category
                </th>
                <th className="px-pad-sm font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold text-right">
                  Cost Price
                </th>
                <th className="px-pad-sm font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold text-right">
                  Selling Price
                </th>
                <th className="px-pad-sm font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold text-right">
                  Margin
                </th>
                <th className="px-pad-sm font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold text-right">
                  Qty in Stock
                </th>
                <th className="px-pad-sm font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">
                  Stock Status
                </th>
                <th className="px-pad-sm font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">
                  Last Restocked
                </th>
                <th className="px-pad-sm font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 font-body-sm text-body-sm">
              {paginatedProducts.map((prod) => (
                <tr
                  key={prod.id}
                  className={`h-row-h-default hover:bg-surface-container/50 transition-colors group ${
                    prod.status === 'out_of_stock'
                      ? 'bg-error-container/10'
                      : prod.status === 'low_stock'
                        ? 'bg-surface-container-low/20'
                        : ''
                  }`}
                >
                  <td className="px-pad-sm text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(prod.id)}
                      onChange={() => handleToggleSelect(prod.id)}
                      className="rounded-DEFAULT border-outline text-primary focus:ring-0 cursor-pointer"
                    />
                  </td>

                  {/* Product & SKU */}
                  <td className="px-pad-sm py-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-DEFAULT bg-surface-container flex items-center justify-center text-on-surface-variant flex-shrink-0">
                        <span className="material-symbols-outlined text-[18px]">
                          {getCategoryIcon(prod.category)}
                        </span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-label-md text-label-md font-semibold text-on-surface truncate">
                          {prod.name}
                        </span>
                        <div className="flex flex-wrap items-center gap-1 font-mono-numeric-sm text-[11px] text-on-surface-variant">
                          <span>{prod.sku}</span>
                          {prod.ean && <span>• {prod.ean}</span>}
                          {prod.customFields &&
                            Object.entries(prod.customFields)
                              .slice(0, 2)
                              .map(([k, v]) => (
                                <span
                                  key={k}
                                  className="px-1 py-0.2 text-[10px] rounded bg-surface-container font-mono text-on-surface-variant"
                                >
                                  {String(v)}
                                </span>
                              ))}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-pad-sm">
                    <span className="inline-block px-2 py-0.5 rounded-DEFAULT bg-surface-container-low text-on-surface-variant font-label-sm text-[11px] border border-outline-variant/30">
                      {prod.category}
                    </span>
                  </td>

                  {/* Cost Price */}
                  <td className="px-pad-sm text-right font-mono-numeric-md text-mono-numeric-md text-on-surface-variant">
                    ₹{prod.costPrice.toFixed(2)}
                  </td>

                  {/* Selling Price */}
                  <td className="px-pad-sm text-right font-mono-numeric-md text-mono-numeric-md font-semibold text-on-surface">
                    ₹{prod.sellingPrice.toFixed(2)}
                  </td>

                  {/* Margin */}
                  <td className="px-pad-sm text-right font-mono-numeric-md text-mono-numeric-md text-secondary">
                    {prod.margin.toFixed(1)}%
                  </td>

                  {/* Qty in Stock */}
                  <td className="px-pad-sm text-right font-mono-numeric-md text-mono-numeric-md font-semibold text-on-surface">
                    <span className={prod.stock === 0 ? 'text-error' : ''}>{prod.stock}</span>{' '}
                    <span className="font-body-sm text-on-surface-variant font-normal text-[11px]">
                      {prod.unit}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-pad-sm">{renderStockStatusBadge(prod)}</td>

                  {/* Last Restocked */}
                  <td className="px-pad-sm font-mono-numeric-sm text-on-surface-variant text-[12px]">
                    {prod.lastRestocked}
                  </td>

                  {/* Actions */}
                  <td className="px-pad-sm text-right">
                    <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => quickRestockProduct(prod.id, 20)}
                        className="p-1 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-DEFAULT cursor-pointer"
                        title="Quick Restock"
                      >
                        <span className="material-symbols-outlined text-[16px]">add_box</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditProduct?.(prod)}
                        className="p-1 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-DEFAULT cursor-pointer"
                        title="Edit SKU"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      <button
                        type="button"
                        className="p-1 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-DEFAULT cursor-pointer"
                        title="More Options"
                      >
                        <span className="material-symbols-outlined text-[16px]">more_vert</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Ledger Footer */}
        <div className="p-pad-md bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-pad-sm font-label-sm text-label-sm text-on-surface-variant">
          <div className="flex items-center gap-2">
            <span>
              Showing {paginatedProducts.length} of {filteredProducts.length} products
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 bg-surface-container-lowest text-on-surface rounded-DEFAULT hover:bg-surface-container transition-colors shadow-sm disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <span className="px-2 font-mono-numeric-sm text-on-surface">{currentPage}</span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-2.5 py-1 bg-surface-container-lowest text-on-surface rounded-DEFAULT hover:bg-surface-container transition-colors shadow-sm disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
