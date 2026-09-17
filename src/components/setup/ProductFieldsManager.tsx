import React, { useState } from 'react'
import type { CustomProductField } from '../../types/pos'
import { usePOS } from '../../context/POSContext'
import { AddFieldModal } from './AddFieldModal'

interface StandardField {
  name: string
  key: string
  type: string
  required: boolean
  desc: string
}

const STANDARD_FIELDS: StandardField[] = [
  {
    name: 'Product Title / Name',
    key: 'name',
    type: 'text',
    required: true,
    desc: 'Primary product label on invoices and displays',
  },
  {
    name: 'Category',
    key: 'category',
    type: 'select',
    required: true,
    desc: 'Inventory classification and tax grouping',
  },
  {
    name: 'Selling Price (₹)',
    key: 'sellingPrice',
    type: 'number',
    required: true,
    desc: 'Default retail unit selling price',
  },
  {
    name: 'Cost Price (₹)',
    key: 'costPrice',
    type: 'number',
    required: false,
    desc: 'Purchase cost used for margin calculations',
  },
  {
    name: 'Stock Quantity',
    key: 'stock',
    type: 'number',
    required: true,
    desc: 'Current available unit count in warehouse/store',
  },
  {
    name: 'SKU Code',
    key: 'sku',
    type: 'text',
    required: false,
    desc: 'Internal stock keeping unit code',
  },
  {
    name: 'EAN / Barcode',
    key: 'ean',
    type: 'text',
    required: false,
    desc: 'Universal product barcode for optical scanner',
  },
  {
    name: 'Unit of Measure',
    key: 'unit',
    type: 'select',
    required: false,
    desc: 'Pieces (pcs), Packs, Kilograms (kg), Bottles, etc.',
  },
]

export const ProductFieldsManager: React.FC = () => {
  const { settings, updateSettings, showToast } = usePOS()

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingField, setEditingField] = useState<CustomProductField | null>(null)

  const customFields: CustomProductField[] = settings.productFields || []

  const handleSaveField = (field: CustomProductField) => {
    let updated: CustomProductField[]
    const exists = customFields.some((f) => f.id === field.id)

    if (exists) {
      updated = customFields.map((f) => (f.id === field.id ? field : f))
      showToast(`Updated custom field "${field.name}"`, 'success')
    } else {
      updated = [...customFields, field]
      showToast(`Added custom field "${field.name}" to product entry`, 'success')
    }

    updateSettings({ productFields: updated })
  }

  const handleDeleteField = (fieldId: string) => {
    const target = customFields.find((f) => f.id === fieldId)
    const updated = customFields.filter((f) => f.id !== fieldId)
    updateSettings({ productFields: updated })
    showToast(`Removed field "${target?.name || fieldId}"`, 'info')
  }

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= customFields.length) return

    const reordered = [...customFields]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, moved)

    updateSettings({ productFields: reordered })
  }

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'text':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/30'
      case 'number':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
      case 'link':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/30'
      case 'select':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/30'
      case 'date':
        return 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30'
      case 'boolean':
        return 'bg-rose-500/10 text-rose-600 border-rose-500/30'
      default:
        return 'bg-surface-container text-on-surface-variant border-outline-variant/30'
    }
  }

  return (
    <div className="space-y-pad-lg">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-pad-sm pb-pad-sm border-b border-outline-variant/30">
        <div>
          <h2 className="font-headline-sm text-headline-sm text-on-surface">
            Product Entry Fields Configuration
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            Customize the fields your store uses when adding or managing products in inventory and
            billing.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingField(null)
            setIsAddModalOpen(true)
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary hover:bg-primary/90 rounded-DEFAULT font-label-md text-label-md font-semibold transition-all shadow-sm cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Add Custom Field</span>
        </button>
      </div>

      {/* Grid: Left = Fields List, Right = Live Interactive Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-pad-lg">
        {/* Left Column (Fields Management) */}
        <div className="lg:col-span-7 space-y-pad-md">
          {/* Built-in Core Fields */}
          <div className="bg-surface-container-lowest p-pad-md rounded-DEFAULT shadow-sm border border-outline-variant/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">lock</span>
                <span className="font-headline-sm text-headline-sm text-on-surface">
                  Core System Fields ({STANDARD_FIELDS.length})
                </span>
              </div>
              <span className="text-[11px] font-mono-numeric-sm text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
                Always Active
              </span>
            </div>

            <div className="divide-y divide-outline-variant/20 border border-outline-variant/20 rounded-DEFAULT overflow-hidden bg-surface-container-low/40">
              {STANDARD_FIELDS.map((sf) => (
                <div
                  key={sf.key}
                  className="p-2.5 flex items-center justify-between hover:bg-surface-container-low transition-colors"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-label-md text-label-md font-semibold text-on-surface">
                        {sf.name}
                      </span>
                      {sf.required ? (
                        <span className="text-[10px] text-error font-semibold uppercase tracking-wider">
                          Required
                        </span>
                      ) : (
                        <span className="text-[10px] text-on-surface-variant">Optional</span>
                      )}
                    </div>
                    <span className="text-[11px] text-on-surface-variant block truncate">
                      {sf.desc}
                    </span>
                  </div>
                  <span
                    className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded border uppercase ${getTypeBadgeColor(
                      sf.type
                    )}`}
                  >
                    {sf.type}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic Custom Fields Section */}
          <div className="bg-surface-container-lowest p-pad-md rounded-DEFAULT shadow-sm border border-outline-variant/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  dynamic_form
                </span>
                <span className="font-headline-sm text-headline-sm text-on-surface">
                  Custom Business Fields ({customFields.length})
                </span>
              </div>
              <span className="text-[11px] font-mono-numeric-sm text-on-surface-variant">
                User Configured
              </span>
            </div>

            {customFields.length === 0 ? (
              <div className="p-8 text-center bg-surface-container-low rounded-DEFAULT border border-dashed border-outline-variant/50 space-y-2">
                <span className="material-symbols-outlined text-[36px] text-outline-variant">
                  add_circle_outline
                </span>
                <p className="font-label-md text-label-md text-on-surface font-medium">
                  No custom fields configured yet
                </p>
                <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                  Add custom fields such as Brand, Warranty, Manufacturer Link, Size, Color, or
                  Batch Number to tailor the POS to your specific business needs.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingField(null)
                    setIsAddModalOpen(true)
                  }}
                  className="mt-2 px-3.5 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold rounded-DEFAULT transition-colors cursor-pointer"
                >
                  + Add First Custom Field
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {customFields.map((field, idx) => (
                  <div
                    key={field.id}
                    className="p-3 bg-surface-container-low rounded-DEFAULT border border-outline-variant/30 flex items-center justify-between gap-2 hover:border-outline-variant transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-label-md text-label-md font-semibold text-on-surface">
                          {field.name}
                        </span>
                        <span
                          className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded border uppercase ${getTypeBadgeColor(
                            field.type
                          )}`}
                        >
                          {field.type}
                        </span>
                        {field.required && (
                          <span className="text-[10px] text-error font-semibold uppercase">
                            Required
                          </span>
                        )}
                        {field.showInReceipt && (
                          <span className="text-[10px] bg-surface-container-high text-on-surface px-1.5 py-0.2 rounded font-mono">
                            Print on Bill
                          </span>
                        )}
                      </div>
                      {field.type === 'select' && field.options && field.options.length > 0 && (
                        <div className="text-[11px] text-on-surface-variant mt-1 truncate">
                          Options: {field.options.join(', ')}
                        </div>
                      )}
                      {field.placeholder && (
                        <div className="text-[11px] text-on-surface-variant/80 italic mt-0.5">
                          Hint: "{field.placeholder}"
                        </div>
                      )}
                    </div>

                    {/* Controls (Move Up/Down, Edit, Delete) */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveField(idx, 'up')}
                        className="p-1 text-on-surface-variant hover:text-on-surface disabled:opacity-20 cursor-pointer"
                        title="Move Up"
                      >
                        <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                      </button>
                      <button
                        type="button"
                        disabled={idx === customFields.length - 1}
                        onClick={() => handleMoveField(idx, 'down')}
                        className="p-1 text-on-surface-variant hover:text-on-surface disabled:opacity-20 cursor-pointer"
                        title="Move Down"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          arrow_downward
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingField(field)
                          setIsAddModalOpen(true)
                        }}
                        className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-DEFAULT transition-colors cursor-pointer"
                        title="Edit Field"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteField(field.id)}
                        className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container rounded-DEFAULT transition-colors cursor-pointer"
                        title="Delete Field"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Live Interactive Preview of Product Entry) */}
        <div className="lg:col-span-5 space-y-pad-md">
          <div className="bg-surface-container-lowest p-pad-md rounded-DEFAULT shadow-sm border border-outline-variant/30 space-y-pad-sm sticky top-20">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-secondary text-[20px]">
                  visibility
                </span>
                <span className="font-headline-sm text-headline-sm text-on-surface">
                  Live Form Preview
                </span>
              </div>
              <span className="text-[10px] font-mono font-semibold uppercase bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded">
                Real-time
              </span>
            </div>

            <p className="text-xs text-on-surface-variant">
              This preview shows how the product entry modal appears to your team in the Inventory
              page with your custom fields.
            </p>

            {/* Mock Product Form */}
            <div className="p-3 bg-surface-container-low rounded-DEFAULT border border-outline-variant/40 space-y-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-on-surface mb-1">
                  Product Title <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  disabled
                  placeholder="e.g. Wireless Bluetooth Earbuds"
                  className="w-full h-8 px-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded text-on-surface font-medium cursor-not-allowed text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-on-surface mb-1">
                    Category <span className="text-error">*</span>
                  </label>
                  <select
                    disabled
                    className="w-full h-8 px-2 bg-surface-container-lowest border border-outline-variant/30 rounded text-on-surface text-xs"
                  >
                    <option>Electronics</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-on-surface mb-1">
                    Selling Price (₹) <span className="text-error">*</span>
                  </label>
                  <input
                    type="number"
                    disabled
                    placeholder="999.00"
                    className="w-full h-8 px-2 bg-surface-container-lowest border border-outline-variant/30 rounded text-on-surface font-mono text-xs"
                  />
                </div>
              </div>

              {/* Render configured custom fields in preview */}
              {customFields.length > 0 && (
                <div className="pt-2 border-t border-outline-variant/30 space-y-2">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-secondary uppercase tracking-wider">
                    <span>✨ Your Custom Fields</span>
                  </div>
                  {customFields.map((f) => (
                    <div key={f.id}>
                      <label className="block text-[11px] font-semibold text-on-surface mb-1">
                        {f.name} {f.required && <span className="text-error">*</span>}
                      </label>
                      {f.type === 'select' ? (
                        <select
                          disabled
                          className="w-full h-8 px-2 bg-surface-container-lowest border border-outline-variant/30 rounded text-on-surface text-xs"
                        >
                          <option value="">-- Choose {f.name} --</option>
                          {f.options?.map((opt) => (
                            <option key={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : f.type === 'boolean' ? (
                        <div className="flex items-center gap-2 h-8">
                          <input
                            type="checkbox"
                            disabled
                            className="rounded border-outline-variant text-primary"
                          />
                          <span className="text-xs text-on-surface">Enable {f.name}</span>
                        </div>
                      ) : f.type === 'link' ? (
                        <div className="relative">
                          <input
                            type="url"
                            disabled
                            placeholder={f.placeholder || 'https://example.com'}
                            className="w-full h-8 pl-6 pr-2 bg-surface-container-lowest border border-outline-variant/30 rounded text-on-surface text-xs font-mono"
                          />
                          <span className="material-symbols-outlined text-[14px] absolute left-1.5 top-2 text-on-surface-variant">
                            link
                          </span>
                        </div>
                      ) : (
                        <input
                          type={
                            f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'
                          }
                          disabled
                          placeholder={f.placeholder || `Enter ${f.name}`}
                          className="w-full h-8 px-2 bg-surface-container-lowest border border-outline-variant/30 rounded text-on-surface text-xs"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Field Modal */}
      <AddFieldModal
        isOpen={isAddModalOpen}
        fieldToEdit={editingField}
        onClose={() => {
          setIsAddModalOpen(false)
          setEditingField(null)
        }}
        onSave={handleSaveField}
      />
    </div>
  )
}
