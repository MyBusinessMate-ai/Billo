import React, { useState, useEffect } from 'react'
import type { BillingItem } from '../../types/pos'
import { usePOS } from '../../context/POSContext'
import { formatINR } from '../../utils/formatters'

interface CheckoutLedgerProps {
  customer?: {
    id?: string
    name: string
    phone: string
    email?: string
    isWalkIn?: boolean
  }
  items: BillingItem[]
  onUpdateQty?: (productId: string, qty: number) => void
  onRemoveItem: (productId: string) => void
  onClearAll: () => void
  onConfirmBilling: (paymentDetails: {
    paymentMethod: string
    cashTendered?: number
    changeDue?: number
    discountCode?: string
    discountAmount: number
    printReceipt: boolean
  }) => void
}

export const CheckoutLedger: React.FC<CheckoutLedgerProps> = ({
  customer,
  items,
  onRemoveItem,
  onClearAll,
  onConfirmBilling,
}) => {
  const { settings, invoices, customers, showToast, nextInvoiceSequence } = usePOS()

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash')
  const [discountCode] = useState<string>('')
  const [discountAmount] = useState<number>(0)
  const [cashTendered] = useState<number>(2000)
  const [printReceipt, setPrintReceipt] = useState<boolean>(true)

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

  // Calculations
  const grossSubtotal = items.reduce((sum, item) => sum + item.total, 0)
  const defaultTaxPercent =
    typeof settings.taxRatePercent === 'number' ? settings.taxRatePercent : 0
  const hasItemGst = items.some((item) => item.gstPercent !== undefined)
  const taxAmount =
    Math.round(
      (hasItemGst
        ? items.reduce((sum, item) => {
            const rate = item.gstPercent !== undefined ? item.gstPercent : defaultTaxPercent
            return sum + (item.total * rate) / 100
          }, 0)
        : (grossSubtotal * defaultTaxPercent) / 100) * 100
    ) / 100
  const taxPercent = defaultTaxPercent
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0)

  const rawNetPayable = Math.max(0, grossSubtotal + taxAmount - discountAmount)
  const netPayable = Math.round(rawNetPayable)

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
      printReceipt,
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
      <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
        {items.length === 0 ? (
          <div className="py-8 text-center text-on-surface-variant font-body-sm">
            Cart is empty. Scan SKU or pick fast items.
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase">
                <th className="py-2 px-2">Line Item</th>
                <th className="py-2 px-1 text-center">Qty</th>
                <th className="py-2 px-2 text-right">Price</th>
                <th className="py-2 px-2 text-right">Total</th>
                <th className="py-2 px-1 text-center"></th>
              </tr>
            </thead>
            <tbody id="cart-table-body">
              {items.map((item) => (
                <tr
                  key={item.productId}
                  className="cart-row hover:bg-surface-container-low transition-colors"
                >
                  <td className="py-2.5 px-2">
                    <span className="font-body-md text-body-md text-on-surface font-medium block">
                      {item.name}
                    </span>
                    <div className="flex items-center gap-1.5 font-mono-numeric-sm text-mono-numeric-sm text-on-surface-variant">
                      {item.category &&
                        item.category.trim().toLowerCase() !== item.name.trim().toLowerCase() && (
                          <span>{item.category}</span>
                        )}
                      {item.gstPercent !== undefined && item.gstPercent > 0 && (
                        <span className="px-1 py-0.2 text-[10px] rounded bg-surface-container font-mono text-on-surface font-medium">
                          GST {item.gstPercent}%
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-1 text-center font-mono-numeric-md text-mono-numeric-md">
                    {item.quantity}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono-numeric-md text-mono-numeric-md text-on-surface-variant">
                    ₹{item.price.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono-numeric-md text-mono-numeric-md text-on-surface font-semibold">
                    ₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-1 text-center">
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.productId)}
                      className="remove-row-btn text-on-surface-variant hover:text-error p-1 rounded-DEFAULT cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Financial Summary */}
      <div className="bg-surface-container-low p-pad-sm rounded-DEFAULT space-y-2 font-body-md text-body-md">
        <div className="flex items-center justify-between text-on-surface-variant">
          <span className="font-label-md text-label-md">Gross Subtotal</span>
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

        {/* {discountAmount > 0 ? (
          <div className="flex items-center justify-between text-secondary">
            <div className="flex items-center gap-1.5">
              <span className="font-label-md text-label-md">Coupon ({discountCode})</span>
              <button
                type="button"
                id="remove-coupon"
                onClick={() => setDiscountAmount(0)}
                className="text-on-surface-variant hover:text-error leading-none cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">cancel</span>
              </button>
            </div>
            <span className="font-mono-numeric-md text-mono-numeric-md font-semibold" id="discount-val">
              -₹{discountAmount.toFixed(2)}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between text-on-surface-variant">
            <button
              type="button"
              onClick={() => {
                setDiscountCode('REGULAR50')
                setDiscountAmount(50)
              }}
              className="font-label-sm text-secondary hover:underline cursor-pointer"
            >
              + Apply Coupon (REGULAR50)
            </button>
            <span className="font-mono-numeric-md text-mono-numeric-md">₹0.00</span>
          </div>
        )} */}

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
        <div className="bg-surface-container-lowest p-pad-sm rounded-DEFAULT flex items-center justify-between mt-2">
          <div>
            <span className="font-label-sm text-label-sm uppercase text-on-surface-variant tracking-wider block">
              Net Payable
            </span>
            <span className="font-mono-numeric-sm text-mono-numeric-sm text-secondary font-medium">
              Rounding Adjusted
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
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            id="print-receipt-toggle"
            type="checkbox"
            checked={printReceipt}
            onChange={(e) => setPrintReceipt(e.target.checked)}
            className="w-3.5 h-3.5 accent-primary rounded-DEFAULT cursor-pointer"
          />
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            Print Physical Thermal Receipt & Auto-cut
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
