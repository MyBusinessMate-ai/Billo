import React, { useState, useEffect } from 'react'
import type { CustomProductField, CustomFieldType } from '../../types/pos'

interface AddFieldModalProps {
  isOpen: boolean
  fieldToEdit?: CustomProductField | null
  existingSeparateHeaders?: string[]
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
  existingSeparateHeaders = [],
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('')
  const [type, setType] = useState<CustomFieldType>('text')
  const [placeholder, setPlaceholder] = useState('')
  const [required, setRequired] = useState(false)
  const [showInBilling, setShowInBilling] = useState(true)
  const [billColumnPlacement, setBillColumnPlacement] = useState<'separate' | 'merged' | 'hidden'>('merged')
  const [billTargetColumn, setBillTargetColumn] = useState<'description' | 'price' | 'quantity' | 'gst' | 'discount'>('description')
  const [billColumnHeader, setBillColumnHeader] = useState('')
  const [description, setDescription] = useState('')
  const [optionsText, setOptionsText] = useState('')
  const [textCasing, setTextCasing] = useState<'uppercase' | 'lowercase' | 'normal'>('normal')

  useEffect(() => {
    if (fieldToEdit) {
      setName(fieldToEdit.name || '')
      setType(fieldToEdit.type || 'text')
      setPlaceholder(fieldToEdit.placeholder || '')
      setRequired(Boolean(fieldToEdit.required))
      setShowInBilling(fieldToEdit.showInBilling !== false)
      setBillColumnPlacement(fieldToEdit.billColumnPlacement || (fieldToEdit.showInReceipt === false ? 'hidden' : 'merged'))
      setBillTargetColumn(fieldToEdit.billTargetColumn || 'description')
      setBillColumnHeader(fieldToEdit.billColumnHeader || '')
      setDescription(fieldToEdit.description || '')
      setOptionsText(fieldToEdit.options ? fieldToEdit.options.join(', ') : '')
      setTextCasing(fieldToEdit.textCasing || 'normal')
    } else {
      setName('')
      setType('text')
      setPlaceholder('')
      setRequired(false)
      setShowInBilling(true)
      setBillColumnPlacement('merged')
      setBillTargetColumn('description')
      setBillColumnHeader('')
      setDescription('')
      setOptionsText('')
      setTextCasing('normal')
    }
  }, [fieldToEdit, isOpen])

  // Validation for bill column placement
  const getBillPlacementError = (): string | null => {
    if (billColumnPlacement === 'separate') {
      const trimmedHeader = billColumnHeader.trim()
      if (!trimmedHeader) {
        return 'Column header name cannot be empty for a separate column'
      }
      const otherHeaders = existingSeparateHeaders
        .filter((h) => !fieldToEdit?.billColumnHeader || h.toLowerCase() !== fieldToEdit.billColumnHeader.toLowerCase())
        .map((h) => h.toLowerCase())
      if (otherHeaders.includes(trimmedHeader.toLowerCase())) {
        return `A separate column with header "${trimmedHeader}" already exists`
      }
    } else if (billColumnPlacement === 'merged') {
      if (!billTargetColumn) {
        return 'Please select a parent column to merge into'
      }
    }
    return null
  }

  const billPlacementError = getBillPlacementError()

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || billPlacementError) return

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

    const resolvedCasing = type === 'text' || type === 'textarea' ? textCasing : 'normal'

    onSave({
      id,
      name: name.trim(),
      type,
      placeholder: placeholder.trim() || undefined,
      required,
      showInBilling,
      showInReceipt: billColumnPlacement !== 'hidden',
      billColumnPlacement,
      billTargetColumn: billColumnPlacement === 'merged' ? billTargetColumn : undefined,
      billColumnHeader: billColumnPlacement === 'separate' ? billColumnHeader.trim() : undefined,
      textCasing: resolvedCasing,
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

          {/* Text Casing Tri-Switch Slider Button - Only for Text and Multi-line Text */}
          {(type === 'text' || type === 'textarea') && (
            <div className="space-y-1.5 p-3 bg-surface-container-low rounded-DEFAULT border border-outline-variant/30 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <label className="block font-label-md text-label-md text-on-surface font-semibold">
                  Character Casing Rule
                </label>
                <span className="text-[11px] text-on-surface-variant font-mono font-medium">
                  {textCasing === 'uppercase'
                    ? 'ABC (ALL CAPS)'
                    : textCasing === 'lowercase'
                      ? 'abc (all lower)'
                      : 'Aa (As Typed)'}
                </span>
              </div>

              {/* Tri-Switch Slider Button */}
              <div className="relative bg-surface-container-high/90 p-1 rounded-full border border-outline-variant/30 flex items-center select-none shadow-2xs">
                {/* Animated Sliding Background Pill */}
                <div
                  className="absolute top-1 bottom-1 rounded-full bg-primary shadow-sm transition-all duration-200 ease-out pointer-events-none"
                  style={{
                    width: 'calc((100% - 8px) / 3)',
                    left:
                      textCasing === 'uppercase'
                        ? '4px'
                        : textCasing === 'lowercase'
                          ? 'calc(4px + (100% - 8px) / 3)'
                          : 'calc(4px + ((100% - 8px) / 3) * 2)',
                  }}
                />

                {/* Option 1: UPPERCASE */}
                <button
                  type="button"
                  onClick={() => setTextCasing('uppercase')}
                  className={`relative z-10 flex-1 py-1.5 text-center text-xs font-bold rounded-full transition-colors cursor-pointer ${
                    textCasing === 'uppercase'
                      ? 'text-on-primary'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  UPPERCASE
                </button>

                {/* Option 2: lowercase */}
                <button
                  type="button"
                  onClick={() => setTextCasing('lowercase')}
                  className={`relative z-10 flex-1 py-1.5 text-center text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                    textCasing === 'lowercase'
                      ? 'text-on-primary font-bold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  lowercase
                </button>

                {/* Option 3: NormalCase */}
                <button
                  type="button"
                  onClick={() => setTextCasing('normal')}
                  className={`relative z-10 flex-1 py-1.5 text-center text-xs font-medium rounded-full transition-colors cursor-pointer ${
                    textCasing === 'normal'
                      ? 'text-on-primary font-bold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  NormalCase
                </button>
              </div>
              <span className="text-[10px] text-on-surface-variant block">
                Enforces text casing in product entry inputs, database storage, and invoice bills.
              </span>
            </div>
          )}

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

          {/* Bill Column Placement Section */}
          <div className="space-y-2 pt-2 border-t border-outline-variant/20">
            <div className="flex items-center justify-between">
              <label className="block font-label-md text-label-md text-on-surface font-semibold">
                Bill / Invoice Column Placement <span className="text-error">*</span>
              </label>
              {billPlacementError && (
                <div className="flex items-center gap-1 text-error text-[11px] font-bold">
                  <span className="material-symbols-outlined text-[16px]">cancel</span>
                  <span>Invalid Setup</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setBillColumnPlacement('merged')}
                className={`p-2 rounded-DEFAULT border text-left cursor-pointer transition-all ${
                  billColumnPlacement === 'merged'
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-outline-variant/30 bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">view_column</span>
                  <span className="text-xs">Same Column</span>
                </div>
                <span className="text-[10px] text-on-surface-variant/80 block mt-0.5 leading-tight">
                  Stack inside parent
                </span>
              </button>

              <button
                type="button"
                onClick={() => setBillColumnPlacement('separate')}
                className={`p-2 rounded-DEFAULT border text-left cursor-pointer transition-all ${
                  billColumnPlacement === 'separate'
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-outline-variant/30 bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">add_column_right</span>
                  <span className="text-xs">Separate Col</span>
                </div>
                <span className="text-[10px] text-on-surface-variant/80 block mt-0.5 leading-tight">
                  Dedicated header
                </span>
              </button>

              <button
                type="button"
                onClick={() => setBillColumnPlacement('hidden')}
                className={`p-2 rounded-DEFAULT border text-left cursor-pointer transition-all ${
                  billColumnPlacement === 'hidden'
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-outline-variant/30 bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">visibility_off</span>
                  <span className="text-xs">Do Not Print</span>
                </div>
                <span className="text-[10px] text-on-surface-variant/80 block mt-0.5 leading-tight">
                  Hidden on bill
                </span>
              </button>
            </div>

            {/* If Separate Column Chosen */}
            {billColumnPlacement === 'separate' && (
              <div className="p-3 bg-surface-container-low rounded-DEFAULT border border-outline-variant/30 space-y-1.5 animate-in fade-in">
                <label className="block font-label-sm text-xs text-on-surface font-semibold">
                  Column Header Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={billColumnHeader}
                  onChange={(e) => setBillColumnHeader(e.target.value)}
                  placeholder="e.g. Size / IMEI / Serial No / Batch"
                  className={`w-full h-9 px-3 bg-surface-container-lowest rounded-DEFAULT text-on-surface text-xs focus:outline-none border ${
                    !billColumnHeader.trim() || billPlacementError
                      ? 'border-error focus:ring-1 focus:ring-error'
                      : 'border-outline-variant/40 focus:ring-1 focus:ring-primary'
                  }`}
                />
                {billPlacementError ? (
                  <div className="flex items-center gap-1.5 text-error text-[11px] font-semibold mt-1">
                    <span className="material-symbols-outlined text-[16px]">cancel</span>
                    <span>{billPlacementError}</span>
                  </div>
                ) : (
                  <span className="text-[10px] text-on-surface-variant block">
                    Will appear as a distinct table column on printed and PDF bills.
                  </span>
                )}
              </div>
            )}

            {/* If Same Column Chosen */}
            {billColumnPlacement === 'merged' && (
              <div className="p-3 bg-surface-container-low rounded-DEFAULT border border-outline-variant/30 space-y-1.5 animate-in fade-in">
                <label className="block font-label-sm text-xs text-on-surface font-semibold">
                  Target Parent Column <span className="text-error">*</span>
                </label>
                <select
                  value={billTargetColumn}
                  onChange={(e) => setBillTargetColumn(e.target.value as any)}
                  className="w-full h-9 px-2 bg-surface-container-lowest rounded-DEFAULT text-on-surface text-xs border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="description">Product / Item Description (Recommended)</option>
                  <option value="price">Rate (₹)</option>
                  <option value="quantity">Qty / Item Count</option>
                  <option value="gst">GST (%)</option>
                  <option value="discount">Discount</option>
                </select>
                <span className="text-[10px] text-on-surface-variant block">
                  Multiple fields sharing this column will be stacked top-to-bottom in defined order.
                </span>
              </div>
            )}
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
                (Must be filled when adding product in billing)
              </span>
            </label>

            <label className="flex items-center gap-2 text-xs text-on-surface cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showInBilling}
                onChange={(e) => setShowInBilling(e.target.checked)}
                className="rounded border-outline-variant text-primary focus:ring-primary"
              />
              <span className="font-semibold">Show in Product Entry Form</span>
              <span className="text-on-surface-variant text-[11px]">
                (Display in dynamic input card on /billing)
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
              disabled={Boolean(billPlacementError)}
              className="px-5 py-2 rounded-DEFAULT bg-primary hover:bg-primary/90 text-on-primary font-label-md text-label-md font-semibold transition-colors cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {billPlacementError && (
                <span className="material-symbols-outlined text-[16px] text-on-primary">cancel</span>
              )}
              <span>{fieldToEdit ? 'Save Changes' : 'Save Field'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
