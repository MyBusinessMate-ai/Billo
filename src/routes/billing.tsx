import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { CustomerLookup } from '../components/billing/CustomerLookup'
import { ProductScanner } from '../components/billing/ProductScanner'
import { CheckoutLedger } from '../components/billing/CheckoutLedger'
import { ThermalReceiptModal } from '../components/billing/ThermalReceiptModal'
import type { BillingItem, BillingInvoice } from '../types/pos'
import { usePOS } from '../context/POSContext'

export const Route = createFileRoute('/billing')({
  component: MakeBillingPage,
})

function MakeBillingPage() {
  const { settings, addInvoice, showToast, currentDate, currentTime } = usePOS()

  // Cart items
  const [items, setItems] = useState<BillingItem[]>([])

  const [customer, setCustomer] = useState<{
    id?: string
    name: string
    phone: string
    email?: string
    isWalkIn?: boolean
  }>({
    name: '',
    phone: '',
    email: '',
    isWalkIn: false,
  })

  const [createdInvoice, setCreatedInvoice] = useState<BillingInvoice | null>(null)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false)

  // Track Esc key timestamp for ESC + 1 combination detection
  const lastEscTimeRef = useRef<number>(0)
  const escTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Hotkey listeners for ESC, ESC + 1
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now()

      // If clear confirmation modal is open:
      if (isClearConfirmOpen) {
        if (e.key === 'Escape') {
          e.preventDefault()
          setIsClearConfirmOpen(false)
          return
        }
        if (e.key === 'Enter') {
          e.preventDefault()
          executeClearAll()
          return
        }
        return
      }

      // Check for '1' pressed right after 'Escape' (within 1200ms)
      if (e.key === '1' && now - lastEscTimeRef.current < 1200) {
        e.preventDefault()
        if (escTimeoutRef.current) {
          clearTimeout(escTimeoutRef.current)
          escTimeoutRef.current = null
        }
        lastEscTimeRef.current = 0
        handleDeleteRecentItem()
        return
      }

      // If Escape pressed
      if (e.key === 'Escape') {
        // If an input is currently focused, do not block default unless desired
        const targetTag = (e.target as HTMLElement)?.tagName
        if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT') {
          ;(e.target as HTMLElement).blur()
          return
        }

        e.preventDefault()
        lastEscTimeRef.current = now

        // Set a small delay before opening modal to allow ESC+1 to trigger smoothly
        if (escTimeoutRef.current) clearTimeout(escTimeoutRef.current)
        escTimeoutRef.current = setTimeout(() => {
          if (items.length > 0) {
            setIsClearConfirmOpen(true)
          } else {
            handleReset()
          }
        }, 280)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (escTimeoutRef.current) clearTimeout(escTimeoutRef.current)
    }
  }, [items, isClearConfirmOpen])

  const handleDeleteRecentItem = () => {
    if (items.length === 0) {
      showToast('No items to delete', 'info')
      return
    }
    const lastItem = items[items.length - 1]
    setItems((prev) => prev.slice(0, -1))
    showToast(`Deleted recent item: "${lastItem.name}" [ESC+1]`, 'info')
  }

  const handleAddItem = (newItem: BillingItem) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.productId === newItem.productId)
      if (existing) {
        return prev.map((item) =>
          item.productId === newItem.productId
            ? {
                ...item,
                quantity: item.quantity + newItem.quantity,
                total: (item.quantity + newItem.quantity) * item.price,
              }
            : item
        )
      }
      return [...prev, newItem]
    })
  }

  const handleUpdateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      handleRemoveItem(productId)
      return
    }
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity: qty,
              total: Math.max(0, qty * item.price - (item.discountAmount || 0)),
            }
          : item
      )
    )
  }

  const handleUpdateItem = (updatedItem: BillingItem) => {
    setItems((prev) =>
      prev.map((item) => (item.productId === updatedItem.productId ? updatedItem : item))
    )
  }

  const handleRemoveItem = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId))
  }

  const handleClearAllRequest = () => {
    if (items.length > 0) {
      setIsClearConfirmOpen(true)
    } else {
      handleReset()
    }
  }

  const executeClearAll = () => {
    setItems([])
    setCustomer({
      name: '',
      phone: '',
      email: '',
      isWalkIn: false,
    })
    setIsClearConfirmOpen(false)
    showToast('Cleared all items and reset ledger', 'info')
  }

  const handleReset = () => {
    setItems([])
    setCustomer({
      name: '',
      phone: '',
      email: '',
      isWalkIn: false,
    })
    showToast('Reset billing ledger', 'info')
  }

  const handleConfirmBilling = (paymentDetails: {
    paymentMethod: string
    cashTendered?: number
    changeDue?: number
    discountCode?: string
    discountAmount: number
    printReceipt: boolean
    internalNote?: string
  }) => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0)
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
          : (subtotal * defaultTaxPercent) / 100) * 100
      ) / 100
    const taxPercent = defaultTaxPercent
    const netTotal = Math.round(Math.max(0, subtotal + taxAmount - paymentDetails.discountAmount))

    const newInvoice = addInvoice({
      customer: {
        id: customer.id,
        name: customer.name || 'Walk-in Customer',
        phone: customer.phone || '—',
        email: customer.email,
        isWalkIn: customer.isWalkIn,
      },
      items: [...items],
      subtotal,
      taxPercent,
      taxAmount,
      discountCode: paymentDetails.discountCode,
      discountAmount: paymentDetails.discountAmount,
      netTotal,
      paymentMethod: paymentDetails.paymentMethod,
      cashTendered: paymentDetails.cashTendered,
      changeDue: paymentDetails.changeDue,
      internalNote: paymentDetails.internalNote,
      status: 'completed',
      timestamp: currentTime ? currentTime.split(' ')[1] : '14:32:08',
      date: currentDate || '2024-10-24',
    })

    setCreatedInvoice(newInvoice)
    showToast(`Bill ${newInvoice.id} Settled Successfully!`, 'success')
    if (paymentDetails.printReceipt) {
      setIsReceiptModalOpen(true)
    }

    // Reset items and customer for next transaction
    setItems([])
    setCustomer({
      name: '',
      phone: '',
      email: '',
      isWalkIn: false,
    })
  }

  return (
    <AppLayout>
      {/* Top Header */}
      <div className="flex items-center justify-between pb-pad-sm mb-pad-md">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-headline-md text-headline-md text-on-surface">
                Make Billing
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              High-speed retail transaction register
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-DEFAULT">
            Hotkeys: [F2] Scan • [ESC+1] Delete Recent • [ESC] Clear All • [Ctrl+Enter] Settle
          </span>
          <button
            id="reset-register-btn"
            type="button"
            onClick={handleClearAllRequest}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-DEFAULT transition-colors font-label-md text-label-md cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Reset [Esc]</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-pad-md items-start">
        {/* Left Column (Inputs, Scanner, Customer Lookup) */}
        <div className="lg:col-span-7 space-y-pad-md">
          <CustomerLookup customer={customer} onChange={setCustomer} />
          <div className="space-y-pad-md">
            <ProductScanner onAddItem={handleAddItem} />
          </div>
        </div>

        {/* Right Column (Checkout Ledger) */}
        <div className="lg:col-span-5">
          <CheckoutLedger
            customer={customer}
            items={items}
            onUpdateQty={handleUpdateQty}
            onUpdateItem={handleUpdateItem}
            onRemoveItem={handleRemoveItem}
            onClearAll={handleClearAllRequest}
            onConfirmBilling={handleConfirmBilling}
          />
        </div>
      </div>

      {/* Thermal Receipt Print Modal */}
      <ThermalReceiptModal
        invoice={createdInvoice}
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
      />

      {/* Confirmation Modal for Clearing All Items via ESC or Button */}
      {isClearConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest rounded-DEFAULT shadow-2xl max-w-sm w-full p-pad-lg border border-outline-variant/50 space-y-pad-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-error-container text-error flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">warning</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  Clear All Items?
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  Are you sure you want to remove all {items.length} items from the bill?
                </p>
              </div>
            </div>

            <div className="bg-surface-container-low p-2.5 rounded-DEFAULT text-[11px] font-mono-numeric-sm text-on-surface-variant flex justify-between">
              <span>Tip: Press [ESC + 1] to remove only the recent item without confirmation.</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsClearConfirmOpen(false)}
                className="px-3 py-1.5 rounded-DEFAULT bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md transition-colors cursor-pointer"
              >
                Cancel [Esc]
              </button>
              <button
                type="button"
                onClick={executeClearAll}
                className="px-4 py-1.5 rounded-DEFAULT bg-error hover:bg-error/90 text-on-error font-label-md text-label-md font-semibold transition-colors cursor-pointer shadow-sm"
              >
                Yes, Clear All [Enter]
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
