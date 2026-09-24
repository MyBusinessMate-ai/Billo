import React, { useState, useEffect, useRef } from 'react'
import type { BillingItem } from '../../types/pos'
import { usePOS } from '../../context/POSContext'
import { formatINR, applyTextCasing } from '../../utils/formatters'
import { EditLedgerItemModal } from './EditLedgerItemModal'

interface CheckoutLedgerProps {
  customer?: {
    id?: string
    name: string
    phone: string
    email?: string
    gstin?: string
    isWalkIn?: boolean
  }
  items: BillingItem[]
  onUpdateQty?: (productId: string, qty: number) => void
  onUpdateItem?: (updatedItem: BillingItem) => void
  onRemoveItem: (productId: string) => void
  onClearAll: () => void
  onConfirmBilling: (paymentDetails: {
    paymentMethod: string
    cashTendered?: number
    changeDue?: number
    discountCode?: string
    discountAmount: number
    roundOff?: number
    printReceipt: boolean
    internalNote?: string
    invoiceFormat?: 'thermal' | 'a4'
  }) => void
  onDiscountChange?: (discount: {
    discountAmount: number
    discountCode?: string
    discountType: 'percent' | 'flat'
    discountValue: string
  }) => void
}

export const CheckoutLedger: React.FC<CheckoutLedgerProps> = ({
  customer,
  items,
  onUpdateQty,
  onUpdateItem,
  onRemoveItem,
  onClearAll,
  onConfirmBilling,
  onDiscountChange,
}) => {
  const { settings, invoices, customers, products, showToast, nextInvoiceSequence } = usePOS()

  const [selectedFormat, setSelectedFormat] = useState<'thermal' | 'a4'>(() =>
    settings.invoiceFormat === 'thermal' ? 'thermal' : 'a4'
  )

  useEffect(() => {
    if (settings.invoiceFormat) {
      setSelectedFormat(settings.invoiceFormat === 'thermal' ? 'thermal' : 'a4')
    }
  }, [settings.invoiceFormat])

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash')
  const [discountType, setDiscountType] = useState<'percent' | 'flat'>('percent')
  const [discountValue, setDiscountValue] = useState<string>('')
  const [showNote, setShowNote] = useState<boolean>(false)
  const [internalNote, setInternalNote] = useState<string>('')
  const [cashTendered] = useState<number>(2000)
  const [printReceipt, setPrintReceipt] = useState<boolean>(true)
  const [editingItem, setEditingItem] = useState<BillingItem | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false)

  // Reset discount & note inputs if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      setDiscountValue('')
      setShowNote(false)
      setInternalNote('')
    }
  }, [items.length])

  // Customer Past Billings Analysis
  const cleanCustomerPhone = customer?.phone ? customer.phone.replace(/\D/g, '') : ''
  const customerPastInvoices =
    customer && !customer.isWalkIn && (customer.id || cleanCustomerPhone || customer.name)
      ? invoices.filter((inv) => {
          if (customer.id && inv.customer?.id === customer.id) return true
          if (cleanCustomerPhone && inv.customer?.phone) {
            const cleanInvPhone = inv.customer.phone.replace(/\D/g, '')
            if (cleanInvPhone.length >= 7 && cleanInvPhone === cleanCustomerPhone) return true
          }
          if (
            customer.name &&
            customer.name !== 'Walk-in Customer' &&
            inv.customer?.name &&
            inv.customer.name.trim().toLowerCase() === customer.name.trim().toLowerCase()
          ) {
            return true
          }
          return false
        })
      : []

  const matchedCustomerObj =
    customer && !customer.isWalkIn
      ? customers.find(
          (c) =>
            (customer.id && c.id === customer.id) ||
            (cleanCustomerPhone && c.phone.replace(/\D/g, '') === cleanCustomerPhone)
        )
      : undefined

  const customerTotalSpend =
    customerPastInvoices.length > 0
      ? customerPastInvoices.reduce((s, inv) => s + (inv.netTotal || 0), 0)
      : matchedCustomerObj?.totalSpend || 0

  const customerBillCount =
    customerPastInvoices.length > 0 ? customerPastInvoices.length : matchedCustomerObj?.visits || 0

  // 1. Gross & Item-level Discounts
  const grossSubtotal = items.reduce((sum, item) => sum + item.total, 0)
  const totalGross = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalItemDiscounts = items.reduce((sum, item) => sum + (item.discountAmount || 0), 0)

  // 2. Bill-level Discount
  const parsedDiscountVal = parseFloat(discountValue) || 0
  let discountAmount = 0
  if (parsedDiscountVal > 0 && grossSubtotal > 0) {
    if (discountType === 'percent') {
      const cappedPercent = Math.min(100, Math.max(0, parsedDiscountVal))
      discountAmount = Math.round(((grossSubtotal * cappedPercent) / 100) * 100) / 100
    } else {
      discountAmount = Math.min(grossSubtotal, Math.max(0, parsedDiscountVal))
    }
  }

  const discountCode =
    discountAmount > 0
      ? discountType === 'percent'
        ? `${parsedDiscountVal}% OFF`
        : `₹${parsedDiscountVal} FLAT`
      : undefined

  // 3. Taxable Subtotal (Gross Subtotal minus Bill Discount as per Indian GST Section 15(3))
  const taxableSubtotal = Math.max(0, grossSubtotal - discountAmount)

  // 4. Tax Calculation (GST computed on Taxable Subtotal)
  const defaultTaxPercent =
    typeof settings.taxRatePercent === 'number' ? settings.taxRatePercent : 0
  const hasItemGst = items.some((item) => item.gstPercent !== undefined)

  const discountRatio = grossSubtotal > 0 ? taxableSubtotal / grossSubtotal : 1

  const taxAmount =
    Math.round(
      (hasItemGst
        ? items.reduce((sum, item) => {
            const rate = item.gstPercent !== undefined ? item.gstPercent : defaultTaxPercent
            const discountedLineTaxable = item.total * discountRatio
            return sum + (discountedLineTaxable * rate) / 100
          }, 0)
        : (taxableSubtotal * defaultTaxPercent) / 100) * 100
    ) / 100

  const taxPercent = defaultTaxPercent
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0)

  // 5. Exact Net & Explicit Round-Off Calculation
  const exactNetPayable = Math.max(0, taxableSubtotal + taxAmount)
  const netPayable = Math.round(exactNetPayable)
  const roundOff = Math.round((netPayable - exactNetPayable) * 100) / 100

  const lastReportedDiscountRef = useRef<{ amount: number; code?: string } | null>(null)

  // Notify parent of discount changes for live previews & settlement (guarded against redundant calls)
  useEffect(() => {
    if (!onDiscountChange) return
    const prev = lastReportedDiscountRef.current
    if (!prev || prev.amount !== discountAmount || prev.code !== discountCode) {
      lastReportedDiscountRef.current = { amount: discountAmount, code: discountCode }
      onDiscountChange({
        discountAmount,
        discountCode,
        discountType,
        discountValue,
      })
    }
  }, [discountAmount, discountCode, discountType, discountValue, onDiscountChange])

  const handleClearDiscount = () => {
    setDiscountValue('')
  }

  const handleEditClick = (item: BillingItem) => {
    setEditingItem(item)
    setIsEditModalOpen(true)
  }

  const handleSaveItemEdit = (updatedItem: BillingItem) => {
    if (onUpdateItem) {
      onUpdateItem(updatedItem)
      showToast(`Updated "${updatedItem.name}"`, 'success')
    } else if (onUpdateQty) {
      onUpdateQty(updatedItem.productId, updatedItem.quantity)
    }
  }

  const handleInlineQtyChange = (productId: string, currentQty: number, delta: number) => {
    if (delta > 0) {
      const catalogProd = products.find((p) => p.id === productId)
      if (catalogProd && currentQty + delta > catalogProd.stock) {
        showToast(
          `Only ${catalogProd.stock} units available in stock for "${catalogProd.name}"`,
          'warning'
        )
        return
      }
    }
    const nextQty = Math.max(1, currentQty + delta)
    if (onUpdateQty) {
      onUpdateQty(productId, nextQty)
    } else if (onUpdateItem) {
      const target = items.find((i) => i.productId === productId)
      if (target) {
        onUpdateItem({
          ...target,
          quantity: nextQty,
          total: nextQty * target.price - (target.discountAmount || 0),
        })
      }
    }
  }

  // Hotkeys for settlement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F4') {
        e.preventDefault()
        setPaymentMethod('cash')
      } else if (e.key === 'F8') {
        e.preventDefault()
        setPaymentMethod('upi')
      } else if (e.key === 'F9') {
        e.preventDefault()
        setPaymentMethod('card')
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        if (items.length > 0) {
          handleSettle()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [items, paymentMethod, cashTendered, discountCode, discountAmount, printReceipt, netPayable])

  const handleSettle = () => {
    if (items.length === 0) {
      showToast('Cannot settle empty ledger. Please add items first.', 'error')
      return
    }

    const methodLabel =
      paymentMethod === 'cash' ? 'Cash' : paymentMethod === 'upi' ? 'UPI / QR' : 'Card'

    onConfirmBilling({
      paymentMethod: methodLabel,
      discountCode: discountAmount > 0 ? discountCode : undefined,
      discountAmount,
      roundOff,
      printReceipt,
      internalNote: showNote && internalNote.trim() ? internalNote.trim() : undefined,
      invoiceFormat: selectedFormat,
    })
  }

  return (
    <div className="bg-surface-container-lowest rounded-DEFAULT p-pad-md shadow-sm space-y-pad-md">
      {/* Header */}
      <div className="flex items-center justify-between pb-pad-xs bg-surface-container-lowest">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-headline-sm text-headline-sm text-on-surface">
              Checkout Ledger
            </span>
            <span
              className="bg-surface-container px-2 py-0.2 rounded-DEFAULT font-mono-numeric-sm text-mono-numeric-sm font-semibold"
              id="line-count-badge"
            >
              {items.length} lines
            </span>
          </div>
          <span className="font-mono-numeric-sm text-mono-numeric-sm text-on-surface-variant">
            Invoice Sequence: {nextInvoiceSequence}
          </span>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            id="clear-all-lines"
            onClick={onClearAll}
            className="font-label-sm text-label-sm text-error hover:bg-error-container px-2 py-1 rounded-DEFAULT transition-colors cursor-pointer"
          >
            Clear All [Esc]
          </button>
        )}
      </div>

      {/* Customer Total Billings Summary */}
      {customer && customer.name && !customer.isWalkIn && customer.name !== 'Walk-in Customer' && (
        <div className="bg-surface-container-low px-3 py-2 rounded-DEFAULT flex items-center justify-between border border-outline-variant/30">
          <div className="flex items-center gap-2 truncate">
            <div className="w-7 h-7 rounded-full bg-secondary/15 text-secondary flex items-center justify-center font-bold text-xs shrink-0">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div className="truncate">
              <span className="font-label-md text-label-md font-medium text-on-surface block truncate">
                {customer.name}
              </span>
              <span className="text-[11px] font-mono-numeric-sm text-on-surface-variant block">
                {customer.phone && customer.phone !== '—' ? customer.phone : 'Customer Profile'}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="font-mono-numeric-sm font-semibold text-secondary block">
              {formatINR(customerTotalSpend)}
            </span>
            <span className="text-[10px] text-on-surface-variant font-medium block">
              {customerBillCount} Total {customerBillCount === 1 ? 'Bill' : 'Bills'}
            </span>
          </div>
        </div>
      )}

      {/* Cart Items Table */}
      <div className="overflow-x-auto max-h-[340px] overflow-y-auto">
        {items.length === 0 ? (
          <div className="py-8 text-center text-on-surface-variant font-body-sm">
            Cart is empty. Select a product or enter custom items above.
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase">
                <th className="py-2 px-2">Line Item</th>
                <th className="py-2 px-1 text-center">Qty</th>
                <th className="py-2 px-2 text-right">Price</th>
                <th className="py-2 px-2 text-right">Total</th>
                <th className="py-2 px-1 text-center">Actions</th>
              </tr>
            </thead>
            <tbody id="cart-table-body">
              {items.map((item) => {
                const lineDiscount = item.discountAmount || 0
                const rawLineTotal = item.quantity * item.price

                return (
                  <tr
                    key={item.productId}
                    className="cart-row hover:bg-surface-container-low transition-colors group"
                  >
                    <td className="py-2.5 px-2">
                      <span className="font-body-md text-body-md text-on-surface font-medium block">
                        {item.name}
                      </span>
                      {item.description && (
                        <div className="text-[11px] text-on-surface-variant/80 italic mt-0.5 line-clamp-2">
                          {item.description}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5 font-mono-numeric-sm text-mono-numeric-sm text-on-surface-variant mt-0.5">
                        {item.category &&
                          item.category.trim().toLowerCase() !== item.name.trim().toLowerCase() && (
                            <span className="text-[11px] bg-surface-container px-1 py-0.2 rounded">
                              {item.category}
                            </span>
                          )}
                        {item.gstPercent !== undefined && item.gstPercent > 0 && (
                          <span className="px-1 py-0.2 text-[10px] rounded bg-secondary-container text-on-secondary-container font-mono font-medium">
                            GST {item.gstPercent}%
                          </span>
                        )}
                        {lineDiscount > 0 && (
                          <span className="px-1 py-0.2 text-[10px] rounded bg-tertiary-container text-on-tertiary-container font-mono font-medium">
                            -₹{lineDiscount.toFixed(2)} Off
                          </span>
                        )}
                        {item.customFields &&
                          Object.entries(item.customFields).map(([k, v]) => {
                            const config = item.customFieldConfigs?.find((c) => c.id === k)
                            const valStr = applyTextCasing(v, config?.textCasing)
                            const label = config ? `${config.name}: ${valStr}` : valStr
                            return (
                              <span
                                key={k}
                                className="px-1.5 py-0.2 text-[10px] rounded bg-surface-container-high text-on-surface-variant font-mono"
                              >
                                {label}
                              </span>
                            )
                          })}
                      </div>
                    </td>
                    <td className="py-2.5 px-1 text-center">
                      <div className="inline-flex items-center bg-surface-container rounded border border-outline-variant/30">
                        <button
                          type="button"
                          onClick={() => handleInlineQtyChange(item.productId, item.quantity, -1)}
                          disabled={item.quantity <= 1}
                          className="w-5 h-6 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-l text-xs font-bold disabled:opacity-30 cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-7 text-center font-mono-numeric-sm font-semibold text-on-surface text-xs">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleInlineQtyChange(item.productId, item.quantity, 1)}
                          className="w-5 h-6 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-r text-xs font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono-numeric-md text-mono-numeric-md text-on-surface-variant">
                      ₹{item.price.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono-numeric-md text-mono-numeric-md text-on-surface font-semibold">
                      ₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      {lineDiscount > 0 && (
                        <span className="block text-[10px] text-on-surface-variant line-through font-normal">
                          ₹{rawLineTotal.toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-1 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditClick(item)}
                          className="p-1 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-DEFAULT transition-colors cursor-pointer"
                          title="Edit Line Item"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.productId)}
                          className="remove-row-btn text-on-surface-variant hover:text-error hover:bg-error-container p-1 rounded-DEFAULT transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Line Item Edit Modal */}
      <EditLedgerItemModal
        item={editingItem}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingItem(null)
        }}
        onSave={handleSaveItemEdit}
      />

      {/* Detailed Financial Breakdown */}
      <div className="bg-surface-container-low p-pad-sm rounded-DEFAULT space-y-2 font-body-md text-body-md">
        {totalItemDiscounts > 0 && (
          <>
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="font-label-md text-label-md">Gross Items Total</span>
              <span className="font-mono-numeric-md text-mono-numeric-md text-on-surface font-medium">
                ₹
                {totalGross.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex items-center justify-between text-emerald-700">
              <span className="font-label-md text-label-md font-medium">Line Item Discounts</span>
              <span className="font-mono-numeric-md text-mono-numeric-md font-semibold">
                -₹
                {totalItemDiscounts.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </>
        )}

        <div className="flex items-center justify-between text-on-surface-variant">
          <span className="font-label-md text-label-md">Subtotal</span>
          <span
            className="font-mono-numeric-md text-mono-numeric-md text-on-surface font-medium"
            id="subtotal-val"
          >
            ₹
            {grossSubtotal.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>

        {discountAmount > 0 && (
          <>
            <div className="flex items-center justify-between text-secondary">
              <div className="flex items-center gap-1.5">
                <span className="font-label-md text-label-md font-medium">
                  Bill Discount ({discountType === 'percent' ? `${parsedDiscountVal}%` : 'Direct ₹'}
                  )
                </span>
                <button
                  type="button"
                  id="remove-discount-btn"
                  onClick={handleClearDiscount}
                  className="text-on-surface-variant hover:text-error leading-none cursor-pointer"
                  title="Remove discount"
                >
                  <span className="material-symbols-outlined text-[14px]">cancel</span>
                </button>
              </div>
              <span
                className="font-mono-numeric-md text-mono-numeric-md font-semibold text-secondary"
                id="discount-val"
              >
                -₹
                {discountAmount.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex items-center justify-between text-on-surface-variant bg-surface-container/50 px-2 py-1 rounded-DEFAULT">
              <span className="font-label-sm text-label-sm font-semibold uppercase text-slate-700">
                Taxable Value (Sec 15)
              </span>
              <span className="font-mono-numeric-md text-mono-numeric-md font-bold text-slate-900">
                ₹
                {taxableSubtotal.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </>
        )}

        <div className="flex items-center justify-between text-on-surface-variant">
          <div className="flex items-center gap-1.5">
            <span className="font-label-md text-label-md">
              {hasItemGst ? 'Tax (Itemized GST)' : `Tax (GST ${taxPercent}%)`}
            </span>
            <span className="font-mono-numeric-sm text-[10px] bg-surface-container px-1 rounded-DEFAULT text-on-surface-variant">
              {hasItemGst ? 'Per-Item' : 'Store Default'}
            </span>
          </div>
          <span
            className="font-mono-numeric-md text-mono-numeric-md text-on-surface font-medium"
            id="tax-val"
          >
            ₹{taxAmount.toFixed(2)}
          </span>
        </div>

        {roundOff !== 0 && (
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="font-label-md text-label-md">Round Off Adjustment</span>
            <span
              className={`font-mono-numeric-md text-mono-numeric-md font-semibold ${
                roundOff > 0 ? 'text-emerald-700' : 'text-slate-600'
              }`}
            >
              {roundOff > 0 ? `+₹${roundOff.toFixed(2)}` : `-₹${Math.abs(roundOff).toFixed(2)}`}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-on-surface-variant pt-1">
          <span className="font-label-sm text-label-sm uppercase">Total Units</span>
          <span
            className="font-mono-numeric-sm text-mono-numeric-sm font-semibold text-on-surface"
            id="total-units-val"
          >
            {totalUnits} Items
          </span>
        </div>

        {/* Net Payable Banner */}
        <div className="bg-surface-container-lowest p-pad-sm rounded-DEFAULT flex items-center justify-between mt-2 border border-outline-variant/30 shadow-2xs">
          <div>
            <span className="font-label-sm text-label-sm uppercase text-on-surface-variant tracking-wider block font-semibold">
              Net Payable
            </span>
            <span className="font-mono-numeric-sm text-[11px] text-secondary font-medium">
              {roundOff !== 0 ? 'Rounding Applied' : 'Exact Total'}
            </span>
          </div>
          <span
            className="font-mono-numeric-lg text-[26px] font-bold text-on-surface tracking-tight"
            id="final-total-val"
          >
            ₹
            {netPayable.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>

      {/* Discount Configuration Option (Placed after Net Payable) */}
      <div className="bg-surface-container-low p-pad-sm rounded-DEFAULT space-y-2 border border-outline-variant/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-secondary">
              local_offer
            </span>
            <label className="font-label-sm text-label-sm font-semibold text-on-surface uppercase tracking-wider">
              Discount / Concession
            </label>
          </div>
          {discountAmount > 0 && (
            <button
              type="button"
              onClick={handleClearDiscount}
              className="text-[11px] text-error hover:underline font-label-sm cursor-pointer"
            >
              Clear Discount
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Discount Type Toggle: % vs ₹ */}
          <div className="flex bg-surface-container rounded-DEFAULT p-0.5 shrink-0 border border-outline-variant/30">
            <button
              type="button"
              onClick={() => setDiscountType('percent')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-DEFAULT transition-all cursor-pointer ${
                discountType === 'percent'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              id="discount-type-percent"
            >
              % Percent
            </button>
            <button
              type="button"
              onClick={() => setDiscountType('flat')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-DEFAULT transition-all cursor-pointer ${
                discountType === 'flat'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              id="discount-type-flat"
            >
              ₹ Direct Amount
            </button>
          </div>

          {/* Discount Input Field */}
          <div className="flex-1 bg-surface-container-lowest px-3 py-1.5 rounded-DEFAULT flex items-center border border-outline-variant/40 focus-within:border-primary transition-colors">
            <span className="font-mono-numeric-md text-mono-numeric-md text-on-surface-variant mr-1.5 font-bold">
              {discountType === 'percent' ? '%' : '₹'}
            </span>
            <input
              id="discount-input"
              type="number"
              min="0"
              max={discountType === 'percent' ? 100 : undefined}
              step={discountType === 'percent' ? '1' : '10'}
              placeholder={discountType === 'percent' ? 'e.g. 10' : 'e.g. 50'}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              className="w-full bg-transparent font-mono-numeric-md text-mono-numeric-md font-semibold text-on-surface focus:outline-none"
            />
            {discountValue && (
              <button
                type="button"
                onClick={handleClearDiscount}
                className="text-on-surface-variant hover:text-error cursor-pointer ml-1"
                title="Clear"
              >
                <span className="material-symbols-outlined text-[15px]">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Discount Presets */}
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          <span className="text-[11px] text-on-surface-variant font-label-sm">Quick Pick:</span>
          {discountType === 'percent'
            ? [5, 10, 15, 20, 25].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setDiscountValue(pct.toString())}
                  className={`px-2 py-0.5 rounded-DEFAULT text-[11px] font-mono-numeric-sm transition-colors cursor-pointer ${
                    discountValue === pct.toString()
                      ? 'bg-secondary text-on-secondary font-semibold shadow-2xs'
                      : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                  }`}
                >
                  {pct}%
                </button>
              ))
            : [50, 100, 200, 500].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setDiscountValue(amt.toString())}
                  className={`px-2 py-0.5 rounded-DEFAULT text-[11px] font-mono-numeric-sm transition-colors cursor-pointer ${
                    discountValue === amt.toString()
                      ? 'bg-secondary text-on-secondary font-semibold shadow-2xs'
                      : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                  }`}
                >
                  ₹{amt}
                </button>
              ))}
        </div>
      </div>

      {/* Internal Staff Note Toggle Checkbox & Field (Optional) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none group">
            <input
              type="checkbox"
              id="toggle-internal-note"
              checked={showNote}
              onChange={(e) => {
                setShowNote(e.target.checked)
                if (!e.target.checked) {
                  setInternalNote('')
                }
              }}
              className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary/40 cursor-pointer accent-primary"
            />
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface flex items-center gap-1.5 font-medium group-hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant group-hover:text-primary">
                note_alt
              </span>
              <span>Add Note</span>
              <span className="text-[10px] text-on-surface-variant/60 font-normal lowercase">
                (staff only)
              </span>
            </span>
          </label>
          {showNote && internalNote && (
            <button
              type="button"
              onClick={() => setInternalNote('')}
              className="text-[11px] text-on-surface-variant hover:text-error transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {showNote && (
          <div className="animate-fade-in">
            <input
              type="text"
              id="internal-staff-note"
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              placeholder="e.g. Paid half in cash & half in UPI / Split remarks..."
              autoFocus
              className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/60 rounded-DEFAULT text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs transition-colors"
            />
          </div>
        )}
      </div>

      {/* Settlement Channel */}
      <div>
        <label className="block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-2">
          Settlement Channel
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            data-mode="cash"
            onClick={() => setPaymentMethod('cash')}
            className={`payment-mode-btn flex flex-col items-center justify-center p-2 rounded-DEFAULT transition-all cursor-pointer ${
              paymentMethod === 'cash'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[20px] mb-0.5">payments</span>
            <span className="font-label-md text-label-md font-medium">Cash</span>
            <span className="font-mono-numeric-sm text-[10px] opacity-75">F4</span>
          </button>

          <button
            type="button"
            data-mode="upi"
            onClick={() => setPaymentMethod('upi')}
            className={`payment-mode-btn flex flex-col items-center justify-center p-2 rounded-DEFAULT transition-all cursor-pointer ${
              paymentMethod === 'upi'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[20px] mb-0.5">qr_code_2</span>
            <span className="font-label-md text-label-md font-medium">UPI / QR</span>
            <span className="font-mono-numeric-sm text-[10px] text-on-surface-variant">F8</span>
          </button>

          <button
            type="button"
            data-mode="card"
            onClick={() => setPaymentMethod('card')}
            className={`payment-mode-btn flex flex-col items-center justify-center p-2 rounded-DEFAULT transition-all cursor-pointer ${
              paymentMethod === 'card'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[20px] mb-0.5">credit_card</span>
            <span className="font-label-md text-label-md font-medium">Card</span>
            <span className="font-mono-numeric-sm text-[10px] text-on-surface-variant">F9</span>
          </button>
        </div>
      </div>

      {/* Cash Tendered Panel */}
      {/* {paymentMethod === 'cash' && (
        <div
          className="bg-surface-container-low p-pad-sm rounded-DEFAULT space-y-2"
          id="cash-tendered-panel"
        >
          <div className="flex items-center justify-between">
            <label className="font-label-sm text-label-sm text-on-surface-variant">
              Cash Tendered (₹)
            </label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setCashTendered(1500)}
                className="px-1.5 py-0.5 bg-surface-container font-mono-numeric-sm text-mono-numeric-sm rounded-DEFAULT hover:bg-surface-container-high cursor-pointer"
              >
                ₹1,500
              </button>
              <button
                type="button"
                onClick={() => setCashTendered(2000)}
                className="px-1.5 py-0.5 bg-surface-container font-mono-numeric-sm text-mono-numeric-sm rounded-DEFAULT hover:bg-surface-container-high cursor-pointer"
              >
                ₹2,000
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-surface-container-lowest px-3 py-1.5 rounded-DEFAULT flex items-center">
              <span className="font-mono-numeric-md text-mono-numeric-md text-on-surface-variant mr-1">
                ₹
              </span>
              <input
                id="cash-tendered-input"
                type="number"
                step="10"
                value={cashTendered}
                onChange={(e) => setCashTendered(parseFloat(e.target.value) || 0)}
                className="w-full bg-transparent font-mono-numeric-md text-mono-numeric-md font-semibold text-on-surface focus:outline-none"
              />
            </div>
            <div className="flex-1 bg-secondary-container px-3 py-1.5 rounded-DEFAULT">
              <span className="font-label-sm text-[10px] uppercase text-on-secondary-container block leading-tight">
                Change Due
              </span>
              <span
                id="change-due-val"
                className={`font-mono-numeric-md text-mono-numeric-md font-bold ${
                  changeDue >= 0 ? 'text-on-secondary-container' : 'text-error'
                }`}
              >
                {changeDue >= 0
                  ? `₹${changeDue.toFixed(2)}`
                  : `-₹${Math.abs(changeDue).toFixed(2)}`}
              </span>
            </div>
          </div>
        </div>
      )} */}

      {/* Auto-print & Commit Button */}
      <div className="space-y-2 pt-1">
        {/* Bill Format Quick Switcher */}
        <div className="flex items-center justify-between py-1 px-2.5 bg-surface-container-low rounded-DEFAULT border border-outline-variant/30">
          <div className="flex items-center gap-1.5 text-on-surface-variant font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-[15px]">tune</span>
            <span>Bill Format:</span>
          </div>
          <div className="flex items-center bg-surface-container p-0.5 rounded-DEFAULT">
            <button
              type="button"
              onClick={() => setSelectedFormat('a4')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-DEFAULT font-label-sm text-[11px] transition-all cursor-pointer ${
                selectedFormat === 'a4'
                  ? 'bg-surface-container-lowest text-on-surface font-semibold shadow-2xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[14px] text-secondary">
                description
              </span>
              <span>Letter / A4</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedFormat('thermal')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-DEFAULT font-label-sm text-[11px] transition-all cursor-pointer ${
                selectedFormat === 'thermal'
                  ? 'bg-surface-container-lowest text-on-surface font-semibold shadow-2xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">receipt</span>
              <span>80mm Thermal</span>
            </button>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            id="print-receipt-toggle"
            type="checkbox"
            checked={printReceipt}
            onChange={(e) => setPrintReceipt(e.target.checked)}
            className="w-3.5 h-3.5 accent-primary rounded-DEFAULT cursor-pointer"
          />
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            {selectedFormat === 'a4'
              ? 'Print / View Commercial Invoice (Letter / A4)'
              : 'Print Physical Thermal Receipt (80mm)'}
          </span>
        </label>
        <button
          id="confirm-billing-btn"
          type="button"
          disabled={items.length === 0}
          onClick={handleSettle}
          className="w-full h-12 bg-secondary hover:bg-on-secondary-container text-on-secondary rounded-DEFAULT font-headline-sm text-headline-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
          <span>Billing Confirm [Ctrl + Enter]</span>
        </button>
      </div>
    </div>
  )
}
