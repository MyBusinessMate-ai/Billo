import React, { useState, useEffect } from 'react'
import type { BillingInvoice, BillingItem } from '../../types/pos'
import { usePOS } from '../../context/POSContext'
import { formatINR, sanitizePhone } from '../../utils/formatters'

interface EditInvoiceModalProps {
  invoice: BillingInvoice | null
  isOpen: boolean
  onClose: () => void
  onSaved?: (updatedInvoice: BillingInvoice) => void
}

export const EditInvoiceModal: React.FC<EditInvoiceModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onSaved,
}) => {
  const { updateInvoice, products, categories, settings, showToast } = usePOS()

  // Customer Form State
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerGstin, setCustomerGstin] = useState('')
  const [placeOfSupply, setPlaceOfSupply] = useState('')

  // Invoice Meta State
  const [invoiceDate, setInvoiceDate] = useState('')
  const [invoiceTime, setInvoiceTime] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [invoiceFormat, setInvoiceFormat] = useState<'a4' | 'thermal'>('a4')
  const [internalNote, setInternalNote] = useState('')
  const [termsText, setTermsText] = useState('')

  // Line Items State
  const [items, setItems] = useState<BillingItem[]>([])

  // Financials State
  const [discountAmount, setDiscountAmount] = useState<number>(0)
  const [discountCode, setDiscountCode] = useState<string>('')
  const [taxPercent, setTaxPercent] = useState<number>(0)
  const [roundOff, setRoundOff] = useState<number>(0)

  // New Item Quick Add State
  const [selectedProductId, setSelectedProductId] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Populate form state whenever invoice changes or modal opens
  useEffect(() => {
    if (invoice && isOpen) {
      setCustomerName(invoice.customer?.name || '')
      setCustomerPhone(invoice.customer?.phone === '—' ? '' : invoice.customer?.phone || '')
      setCustomerEmail(invoice.customer?.email || '')
      setCustomerGstin(invoice.customer?.gstin || '')
      setPlaceOfSupply(invoice.placeOfSupply || '')

      setInvoiceDate(invoice.date || '')
      setInvoiceTime(invoice.timestamp || '')
      setPaymentMethod(invoice.paymentMethod || 'Cash')
      setInvoiceFormat(invoice.invoiceFormat || settings.invoiceFormat || 'a4')
      setInternalNote(invoice.internalNote || '')

      // Snapshotted terms or fallback to current settings
      setTermsText(
        invoice.termsText ||
          invoice.billTemplateSnapshot?.termsText ||
          settings.billTemplate?.termsText ||
          '1. Goods once sold can be exchanged within 7 days with original invoice.\n2. Warranty / guarantee as per manufacturer policy.'
      )

      setItems(
        (invoice.items || []).map((it) => ({
          ...it,
          quantity: it.quantity || 1,
          price: it.price || 0,
          total: it.total ?? it.price * it.quantity,
          discountAmount: it.discountAmount || 0,
          discountPercent: it.discountPercent || 0,
          gstPercent: it.gstPercent !== undefined ? it.gstPercent : (invoice.taxPercent ?? settings.taxRatePercent ?? 0),
        }))
      )

      setDiscountAmount(invoice.discountAmount || 0)
      setDiscountCode(invoice.discountCode || '')
      setTaxPercent(
        invoice.taxPercent !== undefined
          ? invoice.taxPercent
          : (settings.taxRatePercent || 0)
      )
      setRoundOff(invoice.roundOff || 0)
    }
  }, [invoice, isOpen, settings])

  if (!isOpen || !invoice) return null

  // Recalculate totals
  const computedSubtotal = items.reduce((sum, item) => {
    const rawLine = item.price * item.quantity
    const disc = item.discountAmount || 0
    return sum + Math.max(0, rawLine - disc)
  }, 0)

  const taxableSubtotal = Math.max(0, computedSubtotal - discountAmount)
  const discountRatio = computedSubtotal > 0 ? taxableSubtotal / computedSubtotal : 1

  const computedTaxAmount = items.reduce((sum, item) => {
    const rawLine = item.price * item.quantity
    const disc = item.discountAmount || 0
    const lineTaxable = Math.max(0, rawLine - disc) * discountRatio
    const rate = item.gstPercent !== undefined ? item.gstPercent : taxPercent
    return sum + (lineTaxable * rate) / 100
  }, 0)

  const exactNet = Math.max(0, taxableSubtotal + computedTaxAmount)
  const computedNetTotal = Math.round(exactNet + roundOff)

  // Item modifications
  const handleItemChange = (index: number, field: keyof BillingItem, value: any) => {
    setItems((prev) => {
      const updated = [...prev]
      const current = { ...updated[index], [field]: value }

      const qty = current.quantity > 0 ? current.quantity : 1
      const price = current.price >= 0 ? current.price : 0
      const lineGross = qty * price
      const disc = current.discountAmount || 0

      current.total = Math.max(0, lineGross - disc)
      updated[index] = current
      return updated
    })
  }

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      showToast('A bill must contain at least one item', 'warning')
      return
    }
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAddCatalogProduct = () => {
    if (!selectedProductId) return
    const prod = products.find((p) => p.id === selectedProductId)
    if (!prod) return

    const newItem: BillingItem = {
      productId: prod.id,
      name: prod.name,
      category: prod.category || 'General',
      price: prod.sellingPrice,
      quantity: 1,
      total: prod.sellingPrice,
      gstPercent: taxPercent,
      hsn: '84733099',
    }

    setItems((prev) => [...prev, newItem])
    setSelectedProductId('')
    showToast(`Added "${prod.name}" to bill`, 'info')
  }

  const handleAddCustomItem = () => {
    const newItem: BillingItem = {
      productId: `custom-${Date.now()}`,
      name: 'Custom Product / Service',
      category: categories[0]?.categoryName || 'General',
      price: 100,
      quantity: 1,
      total: 100,
      gstPercent: taxPercent,
    }
    setItems((prev) => [...prev, newItem])
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) {
      showToast('Please add at least one line item', 'error')
      return
    }

    setIsSaving(true)

    const cleanPhone = customerPhone.trim() ? sanitizePhone(customerPhone) : '—'
    const cleanEmail = customerEmail.trim() ? customerEmail.trim().toLowerCase() : ''
    const cleanName = customerName.trim() ? customerName.trim().toUpperCase() : 'WALK-IN CUSTOMER'
    const cleanGstin = customerGstin.trim() ? customerGstin.trim().toUpperCase() : ''

    const updatedData: Partial<BillingInvoice> = {
      customer: {
        id: invoice.customer?.id,
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail || undefined,
        gstin: cleanGstin || undefined,
        isWalkIn: invoice.customer?.isWalkIn ?? (!invoice.customer?.id),
      },
      items: items.map((it) => ({
        ...it,
        total: Math.max(0, it.price * it.quantity - (it.discountAmount || 0)),
      })),
      subtotal: Math.round(computedSubtotal * 100) / 100,
      taxPercent,
      taxAmount: Math.round(computedTaxAmount * 100) / 100,
      discountAmount,
      discountCode: discountCode.trim() || undefined,
      netTotal: computedNetTotal,
      roundOff,
      placeOfSupply: placeOfSupply.trim() || undefined,
      paymentMethod,
      invoiceFormat,
      internalNote: internalNote.trim() || undefined,
      termsText: termsText.trim() || undefined,
      date: invoiceDate.trim() || invoice.date,
      timestamp: invoiceTime.trim() || invoice.timestamp,
    }

    try {
      const saved = await updateInvoice(invoice.id, updatedData)
      if (onSaved) {
        onSaved(saved)
      }
      onClose()
    } catch (err) {
      console.error('[EditInvoiceModal] Save error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-60 bg-inverse-surface/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-5 animate-fade-in overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose()
      }}
    >
      <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-DEFAULT shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden my-auto animate-scale-in">
        {/* Modal Header */}
        <div className="px-pad-lg py-3.5 bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary-container/40 text-secondary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">edit_document</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Edit Bill #{invoice.id.replace('#', '')}
                </h2>
                <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[13px]">info</span>
                  Will mark as EDITED
                </span>
              </div>
              <p className="text-[12px] text-on-surface-variant">
                Modify customer profile, products, tax/discounts, date, and terms & conditions.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-DEFAULT transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-pad-lg flex flex-col gap-pad-md">
          {/* Section 1: Customer Profile & Invoice Info */}
          <div className="bg-surface-container-low p-pad-md rounded-DEFAULT border border-outline-variant/20 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
              <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[17px] text-secondary">person</span>
                Customer & Invoice Metadata
              </span>
              <span className="text-[11px] text-on-surface-variant font-mono">
                Original Date: {invoice.date}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Customer Name */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">
                  Customer Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  required
                  className="px-3 py-2 bg-surface-container-lowest border border-outline-variant/40 rounded-DEFAULT text-xs text-on-surface focus:outline-none focus:border-secondary shadow-2xs"
                />
              </div>

              {/* Customer Phone */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">Phone Number</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="px-3 py-2 bg-surface-container-lowest border border-outline-variant/40 rounded-DEFAULT text-xs text-on-surface font-mono focus:outline-none focus:border-secondary shadow-2xs"
                />
              </div>

              {/* Customer Email (Optional, No Dummy Forced) */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">
                  Email Address <span className="text-on-surface-variant font-normal">(Optional)</span>
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="Leave empty if not provided"
                  className="px-3 py-2 bg-surface-container-lowest border border-outline-variant/40 rounded-DEFAULT text-xs text-on-surface focus:outline-none focus:border-secondary shadow-2xs"
                />
              </div>

              {/* Customer GSTIN */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">
                  GSTIN <span className="text-on-surface-variant font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={customerGstin}
                  onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                  placeholder="e.g. 36AAAAA0000A1Z5"
                  maxLength={15}
                  className="px-3 py-2 bg-surface-container-lowest border border-outline-variant/40 rounded-DEFAULT text-xs text-on-surface font-mono uppercase focus:outline-none focus:border-secondary shadow-2xs"
                />
              </div>

              {/* Invoice Date */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">
                  Invoice Date <span className="text-on-surface-variant font-normal">(Preserved)</span>
                </label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="px-3 py-2 bg-surface-container-lowest border border-outline-variant/40 rounded-DEFAULT text-xs text-on-surface font-mono focus:outline-none focus:border-secondary shadow-2xs"
                />
              </div>

              {/* Payment Mode */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="px-3 py-2 bg-surface-container-lowest border border-outline-variant/40 rounded-DEFAULT text-xs text-on-surface focus:outline-none focus:border-secondary shadow-2xs cursor-pointer"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI / QR">UPI / QR</option>
                  <option value="Card">Card</option>
                </select>
              </div>

              {/* Place of Supply */}
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-xs font-semibold text-on-surface">Place of Supply</label>
                <input
                  type="text"
                  value={placeOfSupply}
                  onChange={(e) => setPlaceOfSupply(e.target.value)}
                  placeholder="e.g. Intra-State (Code 36) or Inter-State (Code 27)"
                  className="px-3 py-2 bg-surface-container-lowest border border-outline-variant/40 rounded-DEFAULT text-xs text-on-surface focus:outline-none focus:border-secondary shadow-2xs"
                />
              </div>

              {/* Invoice Print Format */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">Print Template</label>
                <select
                  value={invoiceFormat}
                  onChange={(e) => setInvoiceFormat(e.target.value as 'a4' | 'thermal')}
                  className="px-3 py-2 bg-surface-container-lowest border border-outline-variant/40 rounded-DEFAULT text-xs text-on-surface focus:outline-none focus:border-secondary shadow-2xs cursor-pointer"
                >
                  <option value="a4">Letter / A4 Commercial</option>
                  <option value="thermal">80mm Thermal Slip</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Line Items Ledger */}
          <div className="bg-surface-container-low p-pad-md rounded-DEFAULT border border-outline-variant/20 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/20 pb-2">
              <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[17px] text-secondary">
                  shopping_cart
                </span>
                Purchased Items ({items.length})
              </span>

              {/* Quick Add Product Controls */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="px-2.5 py-1.5 bg-surface-container-lowest border border-outline-variant/40 rounded-DEFAULT text-xs text-on-surface focus:outline-none focus:border-secondary max-w-[200px]"
                >
                  <option value="">Select Catalog Item...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - ₹{p.sellingPrice}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddCatalogProduct}
                  disabled={!selectedProductId}
                  className="px-3 py-1.5 bg-secondary text-on-secondary hover:bg-on-secondary-container rounded-DEFAULT text-xs font-semibold transition-colors disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">add</span>
                  Add
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomItem}
                  className="px-3 py-1.5 bg-surface-container-lowest hover:bg-surface-container text-on-surface border border-outline-variant/40 rounded-DEFAULT text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">edit_note</span>
                  Custom Row
                </button>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto bg-surface-container-lowest rounded-DEFAULT border border-outline-variant/30">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant font-bold border-b border-outline-variant/30">
                    <th className="py-2 px-3">Item Name & Details</th>
                    <th className="py-2 px-2 text-center w-20">Qty</th>
                    <th className="py-2 px-2 text-right w-24">Price (₹)</th>
                    <th className="py-2 px-2 text-right w-20">Disc (₹)</th>
                    <th className="py-2 px-2 text-right w-20">GST %</th>
                    <th className="py-2 px-3 text-right w-28">Total (₹)</th>
                    <th className="py-2 px-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-surface-container-low/40">
                      {/* Name & Description */}
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                          className="w-full px-2 py-1 bg-surface-container-lowest border border-outline-variant/30 rounded text-xs font-semibold text-on-surface focus:outline-none focus:border-secondary"
                          placeholder="Item Name"
                          required
                        />
                        <input
                          type="text"
                          value={item.description || ''}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          className="w-full mt-1 px-2 py-0.5 bg-surface-container-lowest border border-outline-variant/20 rounded text-[11px] text-on-surface-variant focus:outline-none focus:border-secondary"
                          placeholder="Description (optional)"
                        />
                      </td>

                      {/* Quantity */}
                      <td className="py-2 px-2 text-center">
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))
                          }
                          className="w-16 px-2 py-1 bg-surface-container-lowest border border-outline-variant/30 rounded text-xs text-center font-mono text-on-surface focus:outline-none focus:border-secondary"
                        />
                      </td>

                      {/* Unit Price */}
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.price}
                          onChange={(e) =>
                            handleItemChange(idx, 'price', Math.max(0, parseFloat(e.target.value) || 0))
                          }
                          className="w-20 px-2 py-1 bg-surface-container-lowest border border-outline-variant/30 rounded text-xs text-right font-mono text-on-surface focus:outline-none focus:border-secondary"
                        />
                      </td>

                      {/* Line Discount */}
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.discountAmount || 0}
                          onChange={(e) =>
                            handleItemChange(
                              idx,
                              'discountAmount',
                              Math.max(0, parseFloat(e.target.value) || 0)
                            )
                          }
                          className="w-16 px-2 py-1 bg-surface-container-lowest border border-outline-variant/30 rounded text-xs text-right font-mono text-on-surface focus:outline-none focus:border-secondary"
                        />
                      </td>

                      {/* GST % */}
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={item.gstPercent ?? taxPercent}
                          onChange={(e) =>
                            handleItemChange(
                              idx,
                              'gstPercent',
                              Math.max(0, parseFloat(e.target.value) || 0)
                            )
                          }
                          className="w-16 px-2 py-1 bg-surface-container-lowest border border-outline-variant/30 rounded text-xs text-right font-mono text-on-surface focus:outline-none focus:border-secondary"
                        />
                      </td>

                      {/* Line Total */}
                      <td className="py-2 px-3 text-right font-mono font-bold text-on-surface">
                        ₹{item.total.toFixed(2)}
                      </td>

                      {/* Remove Button */}
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-on-surface-variant hover:text-error hover:bg-error-container/20 rounded transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Financial Summary & Discounts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-pad-md">
            {/* Bill Discounts & Notes */}
            <div className="bg-surface-container-low p-pad-md rounded-DEFAULT border border-outline-variant/20 flex flex-col gap-3">
              <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[17px] text-secondary">
                  loyalty
                </span>
                Bill-Level Adjustments
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-on-surface">Bill Discount (₹)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="px-3 py-1.5 bg-surface-container-lowest border border-outline-variant/40 rounded-DEFAULT text-xs font-mono text-on-surface focus:outline-none focus:border-secondary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-on-surface">Promo Code</label>
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                    placeholder="e.g. VIP10"
                    className="px-3 py-1.5 bg-surface-container-lowest border border-outline-variant/40 rounded-DEFAULT text-xs font-mono uppercase text-on-surface focus:outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">
                  Internal Staff Note <span className="text-on-surface-variant font-normal">(Staff Only)</span>
                </label>
                <textarea
                  rows={2}
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="Private staff memo for this invoice..."
                  className="px-3 py-1.5 bg-surface-container-lowest border border-outline-variant/40 rounded-DEFAULT text-xs text-on-surface focus:outline-none focus:border-secondary resize-none"
                />
              </div>
            </div>

            {/* Computed Financial Overview */}
            <div className="bg-surface-container-low p-pad-md rounded-DEFAULT border border-outline-variant/20 flex flex-col justify-between gap-2">
              <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider text-on-surface">
                Financial Summary
              </span>

              <div className="flex flex-col gap-1.5 text-xs">
                <div className="flex justify-between text-on-surface-variant">
                  <span>Gross Subtotal:</span>
                  <span className="font-mono font-semibold text-on-surface">
                    ₹{computedSubtotal.toFixed(2)}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-secondary">
                    <span>Bill Discount:</span>
                    <span className="font-mono font-semibold">-₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {computedTaxAmount > 0 && (
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Applicable GST:</span>
                    <span className="font-mono font-semibold text-on-surface">
                      ₹{computedTaxAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-on-surface-variant">
                  <span>Round Off:</span>
                  <input
                    type="number"
                    step="0.01"
                    value={roundOff}
                    onChange={(e) => setRoundOff(parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-0.5 text-right font-mono bg-surface-container-lowest border border-outline-variant/40 rounded text-xs text-on-surface"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-outline-variant/30 flex justify-between items-center">
                <span className="font-bold text-sm text-on-surface">Final Payable:</span>
                <span className="font-mono font-extrabold text-base text-secondary">
                  {formatINR(computedNetTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Snapshotted Terms & Conditions */}
          <div className="bg-surface-container-low p-pad-md rounded-DEFAULT border border-outline-variant/20 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[17px] text-secondary">gavel</span>
                Bill Terms & Conditions (Snapshotted)
              </span>
              <span className="text-[11px] text-on-surface-variant">
                Preserved specifically for this bill
              </span>
            </div>
            <textarea
              rows={3}
              value={termsText}
              onChange={(e) => setTermsText(e.target.value)}
              className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant/40 rounded-DEFAULT text-xs text-on-surface font-sans focus:outline-none focus:border-secondary"
              placeholder="Enter terms and conditions for this bill..."
            />
          </div>
        </form>

        {/* Modal Footer Actions */}
        <div className="px-pad-lg py-3.5 bg-surface-container-low border-t border-outline-variant/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-on-surface-variant font-medium">
            <span className="material-symbols-outlined text-[16px] text-amber-600 dark:text-amber-400">
              history_edu
            </span>
            <span>Editing creates an audit mark with the current timestamp.</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-DEFAULT text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || items.length === 0}
              className="px-5 py-2 bg-secondary text-on-secondary hover:bg-on-secondary-container disabled:opacity-50 rounded-DEFAULT text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isSaving ? 'sync' : 'save'}
              </span>
              <span>{isSaving ? 'Saving Changes...' : 'Save & Update Bill'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
