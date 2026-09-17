import React, { useState, useEffect } from 'react'
import type { CustomProductField, CustomFieldType } from '../../types/pos'

interface AddFieldModalProps {
  isOpen: boolean
  fieldToEdit?: CustomProductField | null
  onClose: () => void
  onSave: (field: CustomProductField) => void
}

const FIELD_TYPES: { type: CustomFieldType; label: string; icon: string; desc: string }[] = [
  {
    type: 'text',
    label: 'Text',
    icon: 'short_text',
    desc: 'Single-line text (e.g. Brand, Model, Material, Color)',
  },
  {
    type: 'number',
    label: 'Number',
    icon: 'tag',
    desc: 'Numeric values (e.g. Weight, Batch No, Shelf Number)',
  },
  {
    type: 'link',
    label: 'Link / URL',
    icon: 'link',
    desc: 'Web link (e.g. Manufacturer page, User Manual, Spec sheet)',
  },
  {
    type: 'select',
    label: 'Dropdown / Select',
    icon: 'arrow_drop_down_circle',
    desc: 'Pick from list of predefined choices (e.g. Size, Warranty, Grade)',
  },
  {
    type: 'date',
    label: 'Date',
    icon: 'calendar_today',
    desc: 'Calendar date (e.g. Expiry Date, Mfg Date, Best Before)',
  },
  {
    type: 'boolean',
    label: 'Toggle / Boolean',
    icon: 'toggle_on',
    desc: 'Yes/No switch (e.g. Fragile, Requires Refrigeration, Returnable)',
  },
  {
    type: 'textarea',
    label: 'Multi-line Text',
    icon: 'notes',
    desc: 'Long description or technical specifications',
  },
]

export const AddFieldModal: React.FC<AddFieldModalProps> = ({
  isOpen,
  fieldToEdit,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('')
  const [type, setType] = useState<CustomFieldType>('text')
  const [placeholder, setPlaceholder] = useState('')
  const [required, setRequired] = useState(false)
  const [showInBilling, setShowInBilling] = useState(true)
  const [showInReceipt, setShowInReceipt] = useState(false)
  const [description, setDescription] = useState('')
  const [optionsText, setOptionsText] = useState('')

  useEffect(() => {
    if (fieldToEdit) {
      setName(fieldToEdit.name || '')
      setType(fieldToEdit.type || 'text')
      setPlaceholder(fieldToEdit.placeholder || '')
      setRequired(Boolean(fieldToEdit.required))
      setShowInBilling(fieldToEdit.showInBilling !== false)
      setShowInReceipt(Boolean(fieldToEdit.showInReceipt))
      setDescription(fieldToEdit.description || '')
      setOptionsText(fieldToEdit.options ? fieldToEdit.options.join(', ') : '')
    } else {
      setName('')
      setType('text')
      setPlaceholder('')
      setRequired(false)
      setShowInBilling(true)
      setShowInReceipt(false)
      setDescription('')
      setOptionsText('')
    }
  }, [fieldToEdit, isOpen])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const parsedOptions =
      type === 'select'
        ? optionsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined

    const id =
      fieldToEdit?.id ||
      `cf_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`

    onSave({
      id,
      name: name.trim(),
      type,
      placeholder: placeholder.trim() || undefined,
      required,
      showInBilling,
      showInReceipt,
      description: description.trim() || undefined,
      options: parsedOptions,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-surface-container-lowest rounded-DEFAULT shadow-2xl max-w-lg w-full overflow-hidden border border-outline-variant/50 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-pad-md bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[22px]">
              {fieldToEdit ? 'edit_document' : 'add_box'}
            </span>
            <div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface leading-tight">
                {fieldToEdit ? 'Edit Custom Product Field' : 'Add Custom Product Field'}
              </h3>
              <p className="font-body-sm text-[11px] text-on-surface-variant">
                Define dynamic attributes for product catalog and inventory
              </p>
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
          {/* Field Name */}
          <div className="space-y-1">
            <label className="block font-label-md text-label-md text-on-surface font-semibold">
              Field Label / Name <span className="text-error">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Brand, Warranty, Manufacturer Link, Size"
              className="w-full h-10 px-3 bg-surface-container-low border border-outline-variant/40 rounded-DEFAULT text-on-surface font-body-sm focus:outline-none focus:ring-1 focus:ring-primary focus:bg-surface-container-lowest"
            />
          </div>

          {/* Field Type Selector */}
          <div className="space-y-1">
            <label className="block font-label-md text-label-md text-on-surface font-semibold">
              Field Data Type <span className="text-error">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FIELD_TYPES.map((ft) => {
                const isSelected = type === ft.type
                return (
                  <button
                    key={ft.type}
                    type="button"
                    onClick={() => setType(ft.type)}
                    className={`flex items-start gap-2.5 p-2.5 rounded-DEFAULT text-left border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-on-surface shadow-2xs'
                        : 'border-outline-variant/30 bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[20px] shrink-0 mt-0.5 ${
                        isSelected ? 'text-primary' : 'text-on-surface-variant'
                      }`}
                    >
                      {ft.icon}
                    </span>
                    <div className="min-w-0">
                      <span className="font-label-md text-label-md font-semibold block text-on-surface leading-tight">
                        {ft.label}
                      </span>
                      <span className="text-[10px] text-on-surface-variant leading-normal block mt-0.5 line-clamp-2">
                        {ft.desc}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* If Type === 'select', Dropdown Options editor */}
          {type === 'select' && (
            <div className="space-y-1 bg-surface-container-low p-3 rounded-DEFAULT border border-outline-variant/30 animate-in fade-in">
              <label className="block font-label-md text-label-md text-on-surface font-semibold">
                Dropdown Options (Comma-separated) <span className="text-error">*</span>
              </label>
              <input
                type="text"
                required={type === 'select'}
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                placeholder="e.g. Small, Medium, Large, Extra Large"
                className="w-full h-9 px-3 bg-surface-container-lowest border border-outline-variant/40 rounded-DEFAULT text-on-surface text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-[11px] text-on-surface-variant block">
                Preview options:{' '}
                {optionsText
                  ? optionsText
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .join(' • ')
                  : 'None'}
              </span>
            </div>
          )}

          {/* Placeholder / Hint */}
          <div className="space-y-1">
            <label className="block font-label-md text-label-md text-on-surface font-semibold">
              Placeholder / Helper Text (Optional)
            </label>
            <input
              type="text"
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
              placeholder={`e.g. Enter ${name || 'value'}...`}
              className="w-full h-9 px-3 bg-surface-container-low border border-outline-variant/40 rounded-DEFAULT text-on-surface text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="block font-label-md text-label-md text-on-surface font-semibold">
              Description / Tooltip (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 1-year manufacturer replacement warranty info"
              className="w-full h-9 px-3 bg-surface-container-low border border-outline-variant/40 rounded-DEFAULT text-on-surface text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Flags & Toggles */}
          <div className="space-y-2 pt-2 border-t border-outline-variant/20">
            <label className="flex items-center gap-2 text-xs text-on-surface cursor-pointer select-none">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                className="rounded border-outline-variant text-primary focus:ring-primary"
              />
              <span className="font-semibold">Required Field</span>
              <span className="text-on-surface-variant text-[11px]">
                (Must be filled when adding product)
              </span>
            </label>

            <label className="flex items-center gap-2 text-xs text-on-surface cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showInBilling}
                onChange={(e) => setShowInBilling(e.target.checked)}
                className="rounded border-outline-variant text-primary focus:ring-primary"
              />
              <span className="font-semibold">Show in Billing Screen</span>
              <span className="text-on-surface-variant text-[11px]">
                (Display in product lookup and cart rows)
              </span>
            </label>

            <label className="flex items-center gap-2 text-xs text-on-surface cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showInReceipt}
                onChange={(e) => setShowInReceipt(e.target.checked)}
                className="rounded border-outline-variant text-primary focus:ring-primary"
              />
              <span className="font-semibold">Print on Customer Receipt</span>
              <span className="text-on-surface-variant text-[11px]">
                (Include this detail on printed thermal bill)
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/30">
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
              {fieldToEdit ? 'Save Changes' : 'Add Field to Catalog'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
