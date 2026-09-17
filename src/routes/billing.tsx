import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef, useCallback } from 'react'
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
    gstin?: string
    isWalkIn?: boolean
  }>({
    name: '',
    phone: '',
    email: '',
    gstin: '',
    isWalkIn: false,
  })

  const [createdInvoice, setCreatedInvoice] = useState<BillingInvoice | null>(null)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false)
  const [ledgerDiscount, setLedgerDiscount] = useState<{
    discountAmount: number
    discountCode?: string
  }>({ discountAmount: 0 })

  // Memoized discount change handler with reference equality check to eliminate infinite update loops
  const handleDiscountChange = useCallback(
    (d: { discountAmount: number; discountCode?: string }) => {
      setLedgerDiscount((prev) => {
        if (prev.discountAmount === d.discountAmount && prev.discountCode === d.discountCode) {
          return prev
        }
        return {
          discountAmount: d.discountAmount,
          discountCode: d.discountCode,
        }
      })
    },
    []
  )

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
        return prev.map((item) => {
          if (item.productId !== newItem.productId) return item
          const combinedQty = item.quantity + newItem.quantity
          const combinedDiscount = (item.discountAmount || 0) + (newItem.discountAmount || 0)
          const combinedTotal = Math.max(0, combinedQty * item.price - combinedDiscount)
          return {
            ...item,
            quantity: combinedQty,
            discountAmount: combinedDiscount > 0 ? combinedDiscount : undefined,
            total: combinedTotal,
          }
        })
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
      gstin: '',
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
      gstin: '',
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
        name: (customer.name || 'Walk-in Customer').toUpperCase(),
        phone: customer.phone || '—',
        email: customer.email ? customer.email.toLowerCase() : undefined,
        gstin: customer.gstin ? customer.gstin.toUpperCase() : undefined,
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
      gstin: '',
      isWalkIn: false,
    })
    setLedgerDiscount({ discountAmount: 0 })
  }

  const handleConfirmFromModal = () => {
    if (items.length === 0) return
    handleConfirmBilling({
      paymentMethod: 'Cash',
      discountAmount: ledgerDiscount.discountAmount || 0,
      discountCode: ledgerDiscount.discountCode,
      printReceipt: true,
    })
  }

  const handleOpenPreview = () => {
    // If there are items in the cart, preview the live cart
    if (items.length > 0) {
      const subtotal = items.reduce(
        (sum, item) => sum + (item.total ?? item.price * item.quantity),
        0
      )
      const defaultTaxPercent =
        typeof settings.taxRatePercent === 'number' ? settings.taxRatePercent : 0
      const hasItemGst = items.some((item) => item.gstPercent !== undefined)
      const taxAmount =
        Math.round(
          (hasItemGst
            ? items.reduce((sum, item) => {
                const rate = item.gstPercent !== undefined ? item.gstPercent : defaultTaxPercent
                return sum + ((item.total ?? item.price * item.quantity) * rate) / 100
              }, 0)
            : (subtotal * defaultTaxPercent) / 100) * 100
        ) / 100
      const billDiscount = ledgerDiscount.discountAmount || 0
      const netTotal = Math.round(Math.max(0, subtotal + taxAmount - billDiscount))

      const previewInvoice: BillingInvoice = {
        id: '#INV-PREVIEW',
        numericId: 9999,
        customer: {
          id: customer.id,
          name: (customer.name || 'Walk-in Customer').toUpperCase(),
          phone: customer.phone || '—',
          email: customer.email ? customer.email.toLowerCase() : undefined,
          gstin: customer.gstin ? customer.gstin.toUpperCase() : undefined,
          isWalkIn: customer.isWalkIn,
        },
        items: [...items],
        subtotal,
        taxPercent: defaultTaxPercent,
        taxAmount,
        discountCode: ledgerDiscount.discountCode,
        discountAmount: billDiscount,
        netTotal,
        paymentMethod: 'UPI / Cash',
        status: 'completed',
        date: currentDate || new Date().toISOString().split('T')[0],
        timestamp: currentTime ? currentTime.split(' ')[1] : '12:00:00',
      }
      setCreatedInvoice(previewInvoice)
      setIsReceiptModalOpen(true)
      showToast('Viewing live invoice preview', 'info')
    } else {
      // If cart is empty, provide a clean realistic sample preview with both item & bill discounts
      const sampleItems: BillingItem[] = [
        {
          productId: 'sample-item-1',
          name: 'Designer Silk Saree',
          description: 'Pure Kanjeevaram Gold Zari Border with Hand Embroidery',
          category: 'Clothing',
          price: 3499,
          quantity: 1,
          discountAmount: 200,
          total: 3299,
          gstPercent: 5,
        },
        {
          productId: 'sample-item-2',
          name: 'Handcrafted Velvet Bangles',
          description: 'Size 2.6, Velvet Finish, Gold Foil Rim',
          category: 'Bangles',
          price: 650,
          quantity: 2,
          discountAmount: 100,
          total: 1200,
          gstPercent: 0,
        },
      ]
      const subtotal = 4499
      const taxAmount = (3299 * 5) / 100
      const sampleBillDiscount = 150
      const netTotal = Math.round(subtotal + taxAmount - sampleBillDiscount)

      const sampleInvoice: BillingInvoice = {
        id: '#INV-PREVIEW',
        numericId: 1001,
        customer: {
          name: customer.name || 'Priya Sharma (Sample)',
          phone: customer.phone || '+91 98765 43210',
          email: customer.email || 'priya.sharma@example.com',
          isWalkIn: false,
        },
        items: sampleItems,
        subtotal,
        taxPercent: 5,
        taxAmount,
        discountCode: 'FESTIVE150',
        discountAmount: sampleBillDiscount,
        netTotal,
        paymentMethod: 'UPI / PhonePe',
        status: 'completed',
        date: currentDate || new Date().toISOString().split('T')[0],
        timestamp: currentTime ? currentTime.split(' ')[1] : '12:00:00',
      }
      setCreatedInvoice(sampleInvoice)
      setIsReceiptModalOpen(true)
      showToast('Showing sample invoice preview (Cart is empty)', 'info')
    }
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
              {/* Quick Preview Icon for Testing */}
              <button
                type="button"
                onClick={handleOpenPreview}
                className="p-1 rounded-DEFAULT hover:bg-surface-container text-on-surface-variant hover:text-secondary transition-colors cursor-pointer"
                title="Preview Invoice Layout (for testing)"
              >
                <span className="material-symbols-outlined text-[20px]">visibility</span>
              </button>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              High-speed retail transaction register
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-block font-label-sm text-label-sm text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-DEFAULT">
            Hotkeys: [F2] Scan • [ESC+1] Delete Recent • [ESC] Clear All • [Ctrl+Enter] Settle
          </span>
          <button
            id="preview-bill-btn"
            type="button"
            onClick={handleOpenPreview}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-container-low hover:bg-surface-container text-on-surface rounded-DEFAULT border border-outline-variant/40 transition-colors font-label-md text-label-md cursor-pointer shadow-2xs"
            title="Preview Bill Layout (for testing)"
          >
            <span className="material-symbols-outlined text-[18px] text-secondary">visibility</span>
            <span>Preview</span>
          </button>
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
            onDiscountChange={handleDiscountChange}
          />
        </div>
      </div>

      {/* Thermal Receipt Print Modal */}
      <ThermalReceiptModal
        invoice={createdInvoice}
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        onConfirmBilling={items.length > 0 ? handleConfirmFromModal : undefined}
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
