import React, { useState, useMemo } from 'react'
import { X, PackagePlus } from 'lucide-react'
import { usePOS } from '../../context/POSContext'
import type { CategoryCustomField } from '../../types/schema'

interface AddProductModalProps {
  isOpen: boolean
  onClose: () => void
}

export const AddProductModal: React.FC<AddProductModalProps> = ({ isOpen, onClose }) => {
  const { addProduct, currentDate, categories, showToast } = usePOS()

  const [name, setName] = useState('')
  const [sku, setSku] = useState('SKU-' + Math.floor(100000 + Math.random() * 900000))
  const [ean, setEan] = useState('EAN-' + Math.floor(100000 + Math.random() * 900000))
  const [category, setCategory] = useState<string>(() => categories[0]?.categoryName || 'General')
  const [costPrice, setCostPrice] = useState<number>(0)
  const [sellingPrice, setSellingPrice] = useState<number>(200)
  const [stock, setStock] = useState<number>(50)
  const [unit, setUnit] = useState<string>('pcs')
  const [customFields, setCustomFields] = useState<Record<string, any>>({})

  const selectedCategory = useMemo(
    () => categories.find((c) => c.categoryName.toLowerCase() === category.toLowerCase()),
    [categories, category]
  )

  const configuredFields: CategoryCustomField[] = selectedCategory?.customFields || []

  if (!isOpen) return null

  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat)
    const catObj = categories.find((c) => c.categoryName.toLowerCase() === newCat.toLowerCase())
    const initialCustom: Record<string, any> = {}
    catObj?.customFields?.forEach((cf) => {
      if (cf.defaultValue !== undefined) {
        initialCustom[cf.id] = cf.defaultValue
      }
    })
    setCustomFields(initialCustom)
  }

  const handleCustomFieldChange = (fieldId: string, val: any) => {
    setCustomFields((prev) => ({
      ...prev,
      [fieldId]: val,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    // Validate required custom fields
    for (const cf of configuredFields) {
      if (cf.required) {
        const v = customFields[cf.id]
        if (v === undefined || v === null || (typeof v === 'string' && !v.trim())) {
          showToast(`Please fill in required custom field: "${cf.name}"`, 'error')
          return
        }
      }
    }

    // Normalize custom fields values with textCasing
    const normalizedCustomFields: Record<string, any> = {}
    configuredFields.forEach((cf) => {
      const v = customFields[cf.id]
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

    const margin =
      sellingPrice > 0 ? Math.round(((sellingPrice - costPrice) / sellingPrice) * 100) : 0

    addProduct({
      name,
      sku,
      ean,
      category,
      costPrice,
      sellingPrice,
      margin: Math.max(0, margin),
      stock,
      unit,
      status: stock > 10 ? 'in_stock' : stock > 0 ? 'low_stock' : 'out_of_stock',
      lastRestocked: currentDate,
      customFields:
        Object.keys(normalizedCustomFields).length > 0 ? normalizedCustomFields : undefined,
    })

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Add New Inventory Product</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3 text-xs overflow-y-auto">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Product Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Organic Almond Milk 1L"
              className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-slate-400 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">SKU</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                EAN / Barcode
              </label>
              <input
                type="text"
                value={ean}
                onChange={(e) => setEan(e.target.value)}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              >
                {categories.length > 0 ? (
                  categories.map((c) => (
                    <option key={c.categoryId} value={c.categoryName}>
                      {c.categoryName}
                    </option>
                  ))
                ) : (
                  <option value="General">General</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as any)}
                className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              >
                <option value="pcs">Pieces (pcs)</option>
                <option value="packs">Packs</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="bottles">Bottles</option>
                <option value="meters">Meters (m)</option>
                <option value="boxes">Boxes</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Cost (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costPrice}
                onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Selling (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={sellingPrice}
                onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Stock <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                required
                value={stock}
                onChange={(e) => setStock(parseInt(e.target.value, 10) || 0)}
                className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
              />
            </div>
          </div>

          {/* Dynamic Custom Product Attributes */}
          {configuredFields.length > 0 && (
            <div className="pt-2 border-t border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Custom Product Attributes
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                  {configuredFields.length} configured
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {configuredFields.map((field) => {
                  const val = customFields[field.id] ?? field.defaultValue ?? ''

                  return (
                    <div
                      key={field.id}
                      className={field.type === 'textarea' ? 'sm:col-span-2' : ''}
                    >
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {field.name} {field.required && <span className="text-rose-500">*</span>}
                      </label>
                      {field.type === 'select' ? (
                        <select
                          required={field.required}
                          value={val}
                          onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                          className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-slate-400"
                        >
                          <option value="">-- Select {field.name} --</option>
                          {field.options?.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : field.type === 'boolean' ? (
                        <label className="flex items-center gap-2 h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(val)}
                            onChange={(e) => handleCustomFieldChange(field.id, e.target.checked)}
                            className="rounded border-slate-300 text-slate-900"
                          />
                          <span className="text-xs text-slate-700">Enable {field.name}</span>
                        </label>
                      ) : field.type === 'textarea' ? (
                        <textarea
                          rows={2}
                          required={field.required}
                          value={val}
                          onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                          placeholder={field.placeholder || `Enter ${field.name}`}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-slate-400"
                        />
                      ) : (
                        <input
                          type={
                            field.type === 'number'
                              ? 'number'
                              : field.type === 'date'
                                ? 'date'
                                : 'text'
                          }
                          required={field.required}
                          value={val}
                          onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                          placeholder={field.placeholder || `Enter ${field.name}`}
                          className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-slate-400"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-white font-bold shadow-xs transition-colors"
            >
              Add Product
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
