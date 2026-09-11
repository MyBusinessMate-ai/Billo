import React, { useState } from 'react'
import type { BillingInvoice } from '../../types/pos'
import { usePOS } from '../../context/POSContext'
import { formatINR } from '../../utils/formatters'

interface RecentTransactionsTableProps {
  onViewInvoice: (invoice: BillingInvoice) => void
  onPrintInvoice: (invoice: BillingInvoice) => void
}

export const RecentTransactionsTable: React.FC<RecentTransactionsTableProps> = ({
  onViewInvoice,
  onPrintInvoice,
}) => {
  const { invoices, settings } = usePOS()
  const [filterMode, setFilterMode] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 6

  const filteredInvoices = invoices.filter((inv) => {
    if (filterMode === 'all') return true
    if (filterMode === 'cash') return inv.paymentMethod.toLowerCase().includes('cash')
    if (filterMode === 'card')
      return (
        inv.paymentMethod.toLowerCase().includes('card') ||
        inv.paymentMethod.toLowerCase().includes('visa') ||
        inv.paymentMethod.toLowerCase().includes('mastercard')
      )
    if (filterMode === 'upi')
      return (
        inv.paymentMethod.toLowerCase().includes('upi') ||
        inv.paymentMethod.toLowerCase().includes('qr') ||
        inv.paymentMethod.toLowerCase().includes('phonepe') ||
        inv.paymentMethod.toLowerCase().includes('gpay')
      )
    return true
  })

  const totalPages = Math.ceil(filteredInvoices.length / pageSize) || 1
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const renderMethodInfo = (method: string) => {
    const m = method.toLowerCase()
    if (m.includes('upi') || m.includes('qr') || m.includes('phonepe') || m.includes('gpay')) {
      return (
        <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-on-surface">
          <span className="material-symbols-outlined text-[14px] text-secondary">qr_code_2</span>
          <span>{method}</span>
        </span>
      )
    }
    if (m.includes('cash')) {
      return (
        <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-on-surface">
          <span className="material-symbols-outlined text-[14px] text-on-surface-variant">
            payments
          </span>
          <span>Cash</span>
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-on-surface">
        <span className="material-symbols-outlined text-[14px] text-primary">credit_card</span>
        <span>{method}</span>
      </span>
    )
  }

  return (
    <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm overflow-hidden">
      {/* Ledger Header & Filter Strip */}
      <div className="p-pad-md flex flex-col sm:flex-row sm:items-center justify-between gap-pad-sm bg-surface-container-lowest">
        <div className="flex items-center gap-3">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">Recent Transactions</h2>
          <span className="font-mono-numeric-sm text-mono-numeric-sm text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-DEFAULT">
            {invoices.length} Recorded
          </span>
        </div>

        {/* Filter Chips */}
        <div
          className="flex items-center gap-1 bg-surface-container-low p-0.5 rounded-DEFAULT self-start sm:self-auto"
          id="filter-group"
        >
          {[
            { id: 'all', label: 'All' },
            { id: 'cash', label: 'Cash' },
            { id: 'card', label: 'Card' },
            { id: 'upi', label: 'UPI / QR' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              data-filter={tab.id}
              onClick={() => {
                setFilterMode(tab.id)
                setCurrentPage(1)
              }}
              className={`px-3 py-1 text-label-sm font-label-sm rounded-DEFAULT transition-colors cursor-pointer ${
                filterMode === tab.id
                  ? 'bg-surface-container-lowest text-on-surface font-semibold shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-y border-outline-variant/30 bg-surface-container-low/50 text-on-surface-variant font-label-sm text-label-sm">
              <th className="py-2.5 px-pad-md font-medium">Receipt #</th>
              <th className="py-2.5 px-pad-md font-medium">Customer</th>
              <th className="py-2.5 px-pad-md font-medium">Items</th>
              <th className="py-2.5 px-pad-md font-medium text-right">Net Total</th>
              <th className="py-2.5 px-pad-md font-medium">Payment Rail</th>
              <th className="py-2.5 px-pad-md font-medium">Status</th>
              <th className="py-2.5 px-pad-md font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20 font-body-sm text-body-sm">
            {paginatedInvoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-on-surface-variant">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[36px] text-outline-variant">
                      receipt_long
                    </span>
                    <p className="font-label-md text-label-md text-on-surface font-medium">
                      No transactions recorded yet
                    </p>
                    <p className="text-[12px] text-on-surface-variant max-w-xs">
                      Completed orders from Make Billing will appear here in real-time.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedInvoices.map((inv) => {
                const isRefunded = inv.status === 'refunded'
                return (
                  <tr
                    key={inv.id}
                    className={`hover:bg-surface-container-low transition-colors ${
                      isRefunded ? 'opacity-70 bg-surface-container-low/30' : ''
                    }`}
                  >
                    <td className="py-3 px-pad-md font-mono-numeric-sm font-semibold text-on-surface">
                      {inv.id}
                    </td>
                    <td className="py-3 px-pad-md text-on-surface font-medium">
                      <div>{inv.customer.name || 'Walk-in Customer'}</div>
                      <div className="text-[11px] text-on-surface-variant font-mono">
                        {inv.customer.phone || '—'}
                      </div>
                    </td>
                    <td className="py-3 px-pad-md text-on-surface-variant font-mono-numeric-sm">
                      {inv.items.length} {inv.items.length === 1 ? 'item' : 'items'}
                    </td>
                    <td className="py-3 px-pad-md text-right font-mono-numeric-sm font-bold text-on-surface">
                      {formatINR(inv.netTotal)}
                    </td>
                    <td className="py-3 px-pad-md">{renderMethodInfo(inv.paymentMethod)}</td>
                    <td className="py-3 px-pad-md">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-DEFAULT text-[11px] font-mono-numeric-sm font-semibold ${
                          isRefunded
                            ? 'bg-error-container text-on-error-container'
                            : 'bg-secondary-container text-on-secondary-container'
                        }`}
                      >
                        {isRefunded ? 'REFUNDED' : 'COMPLETED'}
                      </span>
                    </td>
                    <td className="px-pad-md text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="p-1 hover:bg-surface-container rounded-DEFAULT text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                          title={isRefunded ? 'View Audit Note' : 'View Bill'}
                          type="button"
                          onClick={() => onViewInvoice(inv)}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {isRefunded ? 'info' : 'visibility'}
                          </span>
                        </button>
                        <button
                          className="p-1 hover:bg-surface-container rounded-DEFAULT text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                          title="Thermal Print"
                          type="button"
                          onClick={() => onPrintInvoice(inv)}
                        >
                          <span className="material-symbols-outlined text-[18px]">print</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Ledger Footer */}
      <div className="p-pad-md bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-pad-sm font-label-sm text-label-sm text-on-surface-variant">
        <div className="flex items-center gap-2">
          <span>
            Showing latest {paginatedInvoices.length} of {filteredInvoices.length} transactions
          </span>
          <span>•</span>
          <span className="text-on-surface font-mono-numeric-sm">
            Cash Float: {formatINR(settings.cashDrawerBalance || 5000)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="px-2.5 py-1 bg-surface-container-lowest text-on-surface rounded-DEFAULT hover:bg-surface-container transition-colors shadow-sm disabled:opacity-40 cursor-pointer"
            disabled={currentPage === 1}
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className="px-2 font-mono-numeric-sm text-on-surface">{currentPage}</span>
          <button
            className="px-2.5 py-1 bg-surface-container-lowest text-on-surface rounded-DEFAULT hover:bg-surface-container transition-colors shadow-sm disabled:opacity-40 cursor-pointer"
            disabled={currentPage >= totalPages}
            type="button"
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
