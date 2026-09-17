import React from 'react'
import type { Customer, BillingInvoice } from '../../types/pos'
import { usePOS } from '../../context/POSContext'
import { formatINR } from '../../utils/formatters'

interface CustomerDossierDrawerProps {
  customer: Customer | null
  isOpen: boolean
  onClose: () => void
  onSelectInvoice?: (invoice: BillingInvoice) => void
}

export const CustomerDossierDrawer: React.FC<CustomerDossierDrawerProps> = ({
  customer,
  isOpen,
  onClose,
  onSelectInvoice,
}) => {
  const { invoices, showToast } = usePOS()

  if (!isOpen || !customer) return null

  const initials = customer.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  // Find all real live invoices associated with this customer
  const cleanCustomerPhone = customer.phone ? customer.phone.replace(/\D/g, '') : ''
  const customerInvoices = invoices.filter((inv) => {
    // 1. Direct customer ID match
    if (inv.customer?.id && customer.id && inv.customer.id === customer.id) return true

    // 2. Exact Phone match (7+ digits)
    if (cleanCustomerPhone && cleanCustomerPhone.length >= 7 && inv.customer?.phone) {
      const cleanInvPhone = inv.customer.phone.replace(/\D/g, '')
      if (cleanInvPhone === cleanCustomerPhone) return true
    }

    // 3. Exact Email match
    if (
      customer.email &&
      customer.email.trim() &&
      inv.customer?.email &&
      inv.customer.email.trim() &&
      customer.email.trim().toLowerCase() === inv.customer.email.trim().toLowerCase()
    ) {
      return true
    }

    // 4. Exact Customer Name match (ignoring generic labels)
    if (customer.name && inv.customer?.name) {
      const cName = customer.name.trim().toLowerCase()
      const invName = inv.customer.name.trim().toLowerCase()
      const genericNames = ['walk-in customer', 'walk-in', 'customer', 'loyalty customer', '']
      if (!genericNames.includes(cName) && cName === invName) {
        const cleanInvPhone = inv.customer.phone ? inv.customer.phone.replace(/\D/g, '') : ''
        if (!cleanInvPhone || !cleanCustomerPhone || cleanInvPhone === cleanCustomerPhone) {
          return true
        }
      }
    }
    return false
  })

  // Dynamic real spend computed from customer's actual invoices in DB
  const computedTotalSpend =
    customerInvoices.length > 0
      ? customerInvoices.reduce((sum, inv) => sum + (inv.netTotal || 0), 0)
      : customer.totalSpend || 0

  const computedVisits =
    customerInvoices.length > 0 ? customerInvoices.length : customer.visits || 0

  const handlePrintStatement = () => {
    showToast(`Customer statement generated for ${customer.name}`, 'info')
    window.print()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-inverse-surface/30 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <aside className="fixed right-0 top-0 bottom-0 w-full sm:w-[480px] bg-surface-container-lowest z-50 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Drawer Header */}
          <div className="p-pad-md bg-surface-container-low flex items-center justify-between border-b border-outline-variant/30">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[22px]">badge</span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-headline-sm text-headline-sm text-on-surface leading-none">
                    Customer Dossier
                  </h2>
                  <span className="font-mono-numeric-sm text-[11px] bg-surface-container px-1.5 py-0.5 rounded text-on-surface-variant font-medium">
                    {customer.id}
                  </span>
                </div>
                <span className="font-mono-numeric-sm text-[11px] text-secondary font-medium block mt-1">
                  Total Billings: {formatINR(computedTotalSpend)} •{' '}
                  {customerInvoices.length > 0 ? customerInvoices.length : computedVisits}{' '}
                  {(customerInvoices.length > 0 ? customerInvoices.length : computedVisits) === 1
                    ? 'Bill'
                    : 'Bills'}
                </span>
              </div>
            </div>
            <button
              className="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              onClick={onClose}
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Drawer Content */}
          <div className="p-pad-md space-y-pad-md flex-1">
            {/* Identity Summary Card */}
            <div className="p-pad-md bg-surface-container-low rounded-DEFAULT space-y-pad-xs border border-outline-variant/30">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary text-on-primary font-headline-md font-semibold flex items-center justify-center flex-shrink-0">
                  {initials}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-headline-md text-headline-md text-on-surface font-semibold leading-tight">
                      {customer.name}
                    </h3>
                  </div>
                  <p className="font-mono-numeric-sm text-mono-numeric-sm text-on-surface-variant mt-0.5">
                    {customer.phone}
                  </p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {customer.email && customer.email.trim()
                      ? customer.email
                      : 'No email registered'}
                  </p>
                </div>
              </div>
              <div className="pt-pad-xs grid grid-cols-3 gap-2 text-center">
                <div className="bg-surface-container-lowest p-2 rounded border border-outline-variant/30">
                  <span className="font-label-sm text-[10px] text-on-surface-variant uppercase font-medium">
                    Total Billings
                  </span>
                  <div className="font-mono-numeric-md text-mono-numeric-md font-semibold text-on-surface mt-0.5">
                    {formatINR(computedTotalSpend)}
                  </div>
                </div>
                <div className="bg-surface-container-lowest p-2 rounded border border-outline-variant/30">
                  <span className="font-label-sm text-[10px] text-on-surface-variant uppercase font-medium">
                    Total Invoices
                  </span>
                  <div className="font-mono-numeric-md text-mono-numeric-md font-semibold text-on-surface mt-0.5">
                    {customerInvoices.length > 0 ? customerInvoices.length : computedVisits} Bills
                  </div>
                </div>
                <div className="bg-surface-container-lowest p-2 rounded border border-outline-variant/30">
                  <span className="font-label-sm text-[10px] text-on-surface-variant uppercase font-medium">
                    Avg Ticket
                  </span>
                  <div className="font-mono-numeric-md text-mono-numeric-md font-semibold text-on-surface mt-0.5">
                    {formatINR(
                      (customerInvoices.length || computedVisits) > 0
                        ? Math.round(
                            computedTotalSpend / (customerInvoices.length || computedVisits)
                          )
                        : 0
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* All Transactions Log */}
            <div className="space-y-pad-xs">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
                  Transaction History ({customerInvoices.length})
                </span>
                <span className="font-mono-numeric-sm text-[11px] text-on-surface-variant">
                  {customerInvoices.length} Bills in Database
                </span>
              </div>
              <div className="bg-surface-container-lowest rounded-DEFAULT overflow-hidden shadow-sm border border-outline-variant/30 divide-y divide-outline-variant/20 max-h-[380px] overflow-y-auto">
                {customerInvoices.length === 0 ? (
                  <div className="p-6 text-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-[28px] text-outline-variant block mb-1">
                      receipt_long
                    </span>
                    <p className="font-label-sm text-label-sm font-medium text-on-surface">
                      No transaction records found
                    </p>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      New bills created for this customer will appear here automatically.
                    </p>
                  </div>
                ) : (
                  customerInvoices.map((inv, idx) => {
                    const cleanInvId = inv.id.replace(/^#/, '')
                    const itemsText = `${inv.items.length} ${inv.items.length === 1 ? 'item' : 'items'}`
                    const dateText = inv.date || 'Today'
                    const timeText = inv.timestamp || ''

                    return (
                      <div
                        key={inv.id || idx}
                        onClick={() => {
                          if (onSelectInvoice) {
                            onSelectInvoice(inv)
                          }
                        }}
                        className={`p-3 hover:bg-surface-container-low transition-colors flex items-center justify-between cursor-pointer ${
                          idx % 2 === 1 ? 'bg-surface-container-low/20' : ''
                        }`}
                        title="Click to view full invoice & thermal receipt"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono-numeric-sm font-semibold text-on-surface">
                              {cleanInvId}
                            </span>
                            <span className="material-symbols-outlined text-[14px] text-secondary">
                              visibility
                            </span>
                          </div>
                          <span className="text-on-surface-variant text-[11px] block mt-0.5">
                            {itemsText} • {dateText} {timeText}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono-numeric-sm font-semibold text-on-surface block">
                            {formatINR(inv.netTotal)}
                          </span>
                          <span className="text-secondary text-[11px] font-medium block">
                            Settled • {inv.paymentMethod || 'Cash'}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Drawer Operational Footer */}
          <div className="p-pad-md bg-surface-container-low flex items-center gap-pad-xs border-t border-outline-variant/30">
            <button
              className="flex-1 h-button-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface rounded-DEFAULT font-label-md text-label-md font-semibold flex items-center justify-center gap-2 transition-colors border border-outline-variant/30 cursor-pointer shadow-sm"
              type="button"
              onClick={handlePrintStatement}
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
              <span>Print Customer Statement</span>
            </button>
            <button
              className="h-button-lg px-4 bg-primary hover:bg-on-primary-fixed-variant text-on-primary rounded-DEFAULT font-label-md text-label-md font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              type="button"
              onClick={onClose}
            >
              <span>Close</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
