import React, { useState } from 'react'
import { X, PackagePlus } from 'lucide-react'
import { usePOS } from '../../context/POSContext'

interface AddProductModalProps {
  isOpen: boolean
  onClose: () => void
}

export const AddProductModal: React.FC<AddProductModalProps> = ({ isOpen, onClose }) => {
  const { addProduct, currentDate, categories } = usePOS()

  const [name, setName] = useState('')
  const [sku, setSku] = useState('SKU-' + Math.floor(100000 + Math.random() * 900000))
  const [ean, setEan] = useState('EAN-' + Math.floor(100000 + Math.random() * 900000))
  const [category, setCategory] = useState<string>(() => categories[0]?.categoryName || 'General')
  const [costPrice, setCostPrice] = useState<number>(1.5)
  const [sellingPrice, setSellingPrice] = useState<number>(200)
  const [stock, setStock] = useState<number>(50)
  const [unit, setUnit] = useState<string>('pcs')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const margin = Math.round(((sellingPrice - costPrice * 80) / sellingPrice) * 100) || 40

    addProduct({
      name,
      sku,
      ean,
      category,
      costPrice,
      sellingPrice,
      margin: Math.max(10, margin),
      stock,
      unit,
      status: stock > 10 ? 'in_stock' : stock > 0 ? 'low_stock' : 'out_of_stock',
      lastRestocked: currentDate,
    })

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Add New Inventory Product</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Product Title
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
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
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
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Cost ($)
              </label>
              <input
                type="number"
                step="0.1"
                value={costPrice}
                onChange={(e) => setCostPrice(Number(e.target.value))}
                className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Selling (₹)
              </label>
              <input
                type="number"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Number(e.target.value))}
                className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Stock</label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(Number(e.target.value))}
                className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
              />
            </div>
          </div>

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
