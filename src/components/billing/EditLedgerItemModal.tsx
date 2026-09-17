import React, { useState, useEffect } from 'react'
import type { BillingItem, CustomProductField } from '../../types/pos'
import { usePOS } from '../../context/POSContext'
import { formatINR } from '../../utils/formatters'

interface EditLedgerItemModalProps {
  item: BillingItem | null
  isOpen: boolean
  onClose: () => void
  onSave: (updatedItem: BillingItem) => void
}

export const EditLedgerItemModal: React.FC<EditLedgerItemModalProps> = ({
  item,
  isOpen,
  onClose,
  onSave,
}) => {
  const { settings } = usePOS()

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [quantity, setQuantity] = useState<number>(1)
  const [price, setPrice] = useState<number>(0)
  const [gstPercent, setGstPercent] = useState<number | ''>('')
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount')
  const [discountValue, setDiscountValue] = useState<number>(0)
  const [customFields, setCustomFields] = useState<Record<string, any>>({})

  const billingRules = settings.billingRules || {
    enableItemGst: false,
    defaultGstPercent: 0,
    enableItemDiscount: true,
    enableInvoiceDiscount: true,
  }

  const configuredFields: CustomProductField[] = settings.productFields || []

  useEffect(() => {
    if (item) {
      setName(item.name || '')
      setCategory(item.category || 'General')
      setQuantity(item.quantity || 1)
      setPrice(item.price || 0)
      setGstPercent(item.gstPercent !== undefined ? item.gstPercent : '')
      if (item.discountPercent && item.discountPercent > 0) {
        setDiscountType('percent')
        setDiscountValue(item.discountPercent)
      } else if (item.discountAmount && item.discountAmount > 0) {
        setDiscountType('amount')
        setDiscountValue(item.discountAmount)
      } else {
        setDiscountType('amount')
        setDiscountValue(0)
      }
      setCustomFields(item.customFields ? { ...item.customFields } : {})
    }
  }, [item])

  if (!isOpen || !item) return null

  // Calculate live preview totals for this line item
  const rawTotal = quantity * price
  let lineDiscount = 0
  if (discountValue > 0) {
    if (discountType === 'percent') {
      const clampedPercent = Math.min(100, Math.max(0, discountValue))
      lineDiscount = (rawTotal * clampedPercent) / 100
    } else {
      lineDiscount = Math.min(rawTotal, Math.max(0, discountValue))
    }
  }

  const effectiveTotal = Math.max(0, rawTotal - lineDiscount)

  const handleCustomFieldChange = (fieldId: string, val: any) => {
    setCustomFields((prev) => ({
      ...prev,
      [fieldId]: val,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || quantity <= 0 || price < 0) return

    const updated: BillingItem = {
      ...item,
      name: name.trim(),
      category: category.trim() || 'General',
      quantity: Number(quantity),
      price: Number(price),
      total: effectiveTotal,
      gstPercent: gstPercent !== '' && Number(gstPercent) >= 0 ? Number(gstPercent) : undefined,
      discountAmount: lineDiscount > 0 ? lineDiscount : undefined,
      discountPercent: discountType === 'percent' && discountValue > 0 ? discountValue : undefined,
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
    }

    onSave(updated)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-surface-container-lowest rounded-DEFAULT shadow-2xl max-w-lg w-full overflow-hidden border border-outline-variant/50 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-pad-md bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[22px]">edit_note</span>
            <div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface leading-tight">
                Edit Ledger Line Item
              </h3>
              <span className="font-mono-numeric-sm text-[11px] text-on-surface-variant">
                Modify quantity, price, tax, or line discount
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-pad-md overflow-y-auto space-y-pad-md">
          {/* Item Title & Category */}
          <div className="space-y-pad-xs">
            <label className="block font-label-md text-label-md text-on-surface font-semibold">
              Item Name / Description <span className="text-error">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 bg-surface-container-low border border-outline-variant/40 rounded-DEFAULT text-on-surface font-body-sm focus:outline-none focus:ring-1 focus:ring-primary focus:bg-surface-container-lowest"
              placeholder="e.g. Premium Cotton Shirt"
            />
          </div>

          {/* Quantity & Unit Price Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-pad-md">
            <div className="space-y-pad-xs">
              <label className="block font-label-md text-label-md text-on-surface font-semibold">
                Quantity <span className="text-error">*</span>
              </label>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="h-10 px-3 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-l-DEFAULT font-bold transition-colors cursor-pointer"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full h-10 px-2 text-center bg-surface-container-low border-y border-outline-variant/40 text-on-surface font-mono-numeric-md font-semibold focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="h-10 px-3 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-r-DEFAULT font-bold transition-colors cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            <div className="space-y-pad-xs">
              <label className="block font-label-md text-label-md text-on-surface font-semibold">
                Unit Price (₹) <span className="text-error">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full h-10 px-3 bg-surface-container-low border border-outline-variant/40 rounded-DEFAULT text-on-surface font-mono-numeric-md font-semibold focus:outline-none focus:ring-1 focus:ring-primary focus:bg-surface-container-lowest"
              />
            </div>
          </div>

          {/* Line Item Tax / GST (If enabled in setup) */}
          {(billingRules.enableItemGst || settings.taxRatePercent > 0) && (
            <div className="space-y-pad-xs bg-surface-container-low p-3 rounded-DEFAULT border border-outline-variant/30">
              <div className="flex items-center justify-between">
                <label className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-secondary">
                    receipt_long
                  </span>
                  Line Item GST (%)
                </label>
                <span className="font-mono-numeric-sm text-[10px] text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">
                  {billingRules.enableItemGst ? 'Per-Item GST' : 'Store Default Tax'}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5 pt-1">
                {[0, 5, 12, 18, 28].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setGstPercent(rate)}
                    className={`py-1.5 text-xs font-mono font-semibold rounded-DEFAULT transition-colors cursor-pointer ${
                      gstPercent === rate
                        ? 'bg-primary text-on-primary shadow-2xs'
                        : 'bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Line Item Discount (If enabled in setup) */}
          {billingRules.enableItemDiscount && (
            <div className="space-y-pad-xs bg-surface-container-low p-3 rounded-DEFAULT border border-outline-variant/30">
              <div className="flex items-center justify-between">
                <label className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-secondary">
                    percent
                  </span>
                  Line Item Discount
                </label>
                <div className="flex items-center gap-1 bg-surface-container p-0.5 rounded">
                  <button
                    type="button"
                    onClick={() => setDiscountType('amount')}
                    className={`px-2 py-0.5 text-[11px] rounded font-semibold transition-colors cursor-pointer ${
                      discountType === 'amount'
                        ? 'bg-surface-container-lowest text-on-surface shadow-2xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    ₹ Flat
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('percent')}
                    className={`px-2 py-0.5 text-[11px] rounded font-semibold transition-colors cursor-pointer ${
                      discountType === 'percent'
                        ? 'bg-surface-container-lowest text-on-surface shadow-2xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    % Percent
                  </button>
                </div>
              </div>
              <div className="pt-1">
                <input
                  type="number"
                  min="0"
                  max={discountType === 'percent' ? 100 : rawTotal}
                  step={discountType === 'percent' ? '1' : '0.01'}
                  value={discountValue || ''}
                  onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder={
                    discountType === 'percent' ? 'Discount % (e.g. 10)' : 'Discount amount in ₹'
                  }
                  className="w-full h-9 px-3 bg-surface-container-lowest border border-outline-variant/40 rounded-DEFAULT text-on-surface font-mono-numeric-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          )}

          {/* Dynamic Custom Product Fields */}
          {configuredFields.length > 0 && (
            <div className="space-y-pad-xs pt-1 border-t border-outline-variant/20">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold block">
                Custom Fields
              </span>
              <div className="grid grid-cols-1 gap-2.5">
                {configuredFields.map((field) => {
                  const val = customFields[field.id] ?? field.defaultValue ?? ''
                  return (
                    <div key={field.id} className="space-y-1">
                      <label className="block text-xs font-medium text-on-surface">
                        {field.name}
                        {field.required && <span className="text-error ml-1">*</span>}
                      </label>
                      {field.type === 'select' ? (
                        <select
                          value={val}
                          onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                          className="w-full h-9 px-2.5 bg-surface-container-low border border-outline-variant/40 rounded-DEFAULT text-on-surface text-xs focus:outline-none"
                        >
                          <option value="">-- Select {field.name} --</option>
                          {field.options?.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : field.type === 'boolean' ? (
                        <label className="flex items-center gap-2 text-xs text-on-surface cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(val)}
                            onChange={(e) => handleCustomFieldChange(field.id, e.target.checked)}
                            className="rounded border-outline-variant text-primary focus:ring-primary"
                          />
                          <span>Enable {field.name}</span>
                        </label>
                      ) : field.type === 'textarea' ? (
                        <textarea
                          rows={2}
                          value={val}
                          onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                          placeholder={field.placeholder || `Enter ${field.name}`}
                          className="w-full p-2 bg-surface-container-low border border-outline-variant/40 rounded-DEFAULT text-on-surface text-xs focus:outline-none"
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
                          value={val}
                          onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                          placeholder={field.placeholder || `Enter ${field.name}`}
                          className="w-full h-9 px-3 bg-surface-container-low border border-outline-variant/40 rounded-DEFAULT text-on-surface text-xs focus:outline-none"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Computed Line Total Banner */}
          <div className="bg-surface-container p-3 rounded-DEFAULT flex items-center justify-between border border-outline-variant/30">
            <span className="font-label-md text-label-md text-on-surface font-semibold">
              Computed Line Total
            </span>
            <div className="text-right">
              <span className="font-mono-numeric-lg text-headline-sm font-bold text-secondary">
                {formatINR(effectiveTotal)}
              </span>
              {lineDiscount > 0 && (
                <span className="block text-[11px] font-mono-numeric-sm text-on-surface-variant line-through">
                  {formatINR(rawTotal)}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/30">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-DEFAULT bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-DEFAULT bg-primary hover:bg-primary/90 text-on-primary font-label-md text-label-md font-semibold transition-colors cursor-pointer shadow-sm"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
