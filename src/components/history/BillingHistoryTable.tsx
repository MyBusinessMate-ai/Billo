import React, { useState } from 'react'
import type { BillingInvoice } from '../../types/pos'
import { usePOS } from '../../context/POSContext'
import { formatINR } from '../../utils/formatters'
import { DateRangeFilter } from '../common/DateRangeFilter'
import {
  matchesDateFilter,
  exportBillingInvoicesToCSV,
  type DateFilterState,
} from '../../utils/dateFilter'

interface BillingHistoryTableProps {
  onSelectInvoice: (invoice: BillingInvoice) => void
  selectedInvoiceId?: string
  onOpenReceipt: (invoice: BillingInvoice) => void
}

export const BillingHistoryTable: React.FC<BillingHistoryTableProps> = ({
  onSelectInvoice,
  selectedInvoiceId,
}) => {
  const { invoices, currentDate, showToast } = usePOS()

  const [statusTab] = useState<'all' | 'settled' | 'hold' | 'refund'>('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState<DateFilterState>({ type: 'all' })
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 7

  // Filtered Invoices based on Date, Payment Rail, and Status
  const filteredInvoices = invoices.filter((inv) => {
    const matchesDate = matchesDateFilter(inv.date, dateFilter, currentDate)

    const matchesStatus =
      statusTab === 'all'
        ? true
        : statusTab === 'settled'
          ? inv.status === 'completed'
          : statusTab === 'refund'
            ? inv.status === 'refunded'
            : inv.status === statusTab

    const matchesPayment =
      paymentFilter === 'all' ||
      inv.paymentMethod.toLowerCase().includes(paymentFilter.toLowerCase())

    return matchesDate && matchesStatus && matchesPayment
  })

  const totalSettled = filteredInvoices
    .filter((inv) => inv.status === 'completed')
    .reduce((sum, inv) => sum + inv.netTotal, 0)

  const totalPages = Math.ceil(filteredInvoices.length / rowsPerPage) || 1
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  )

  const handleExportBillingList = () => {
    if (filteredInvoices.length === 0) {
      showToast('No invoices match the current filter to export.', 'info')
      return
    }
    exportBillingInvoicesToCSV(filteredInvoices, 'LedgerPOS_Billing_History')
    showToast(`Exported ${filteredInvoices.length} billing records to CSV`, 'success')
  }

  return (
    <div className="flex flex-col gap-pad-md">
      {/* Top Action & Metric Rail */}
      <div className="p-pad-md bg-surface-container-lowest rounded-DEFAULT shadow-sm flex flex-col gap-pad-md">
        <div className="flex flex-wrap items-center justify-between gap-pad-sm">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-headline-md text-headline-md text-on-surface">
                Billing History
              </span>
            </div>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Archival transaction records, digital tax ledgers & settlement vouchers
            </span>
          </div>

          {/* Quick Metrics & Export Button Ribbon */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="bg-surface-container-low px-3 py-1.5 rounded-DEFAULT flex items-center gap-3">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Settled Total
                </span>
                <span className="font-mono-numeric-md text-mono-numeric-md text-on-surface font-semibold">
                  {formatINR(totalSettled)}
                </span>
              </div>
              <span className="material-symbols-outlined text-secondary text-[20px]">payments</span>
            </div>

            <div className="bg-surface-container-low px-3 py-1.5 rounded-DEFAULT flex items-center gap-3">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Invoices
                </span>
                <span className="font-mono-numeric-md text-mono-numeric-md text-on-surface font-semibold">
                  {filteredInvoices.length} Trans.
                </span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                receipt
              </span>
            </div>

            {/* Export Filtered Billing List Button */}
            <button
              type="button"
              id="export-billing-list-btn"
              onClick={handleExportBillingList}
              disabled={filteredInvoices.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-on-secondary hover:bg-on-secondary-container rounded-DEFAULT font-label-md text-label-md font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-40 active:scale-[0.99]"
              title="Download filtered transactions as CSV"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Export Billing List</span>
              <span className="font-mono-numeric-sm text-[11px] bg-black/15 dark:bg-white/20 px-2 py-0.5 rounded font-semibold ml-0.5">
                {filteredInvoices.length}
              </span>
            </button>
          </div>
        </div>

        {/* Filter Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-pad-sm pt-pad-xs border-t border-outline-variant/20">
          <div className="flex flex-wrap items-center gap-2">
            {/* Date Preset & Custom Range Dropdown Filter */}
            <DateRangeFilter
              filter={dateFilter}
              onChange={(newFilter) => {
                setDateFilter(newFilter)
                setCurrentPage(1)
              }}
              referenceDate={currentDate}
            />

            {/* Payment Mode Filter */}
            <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-DEFAULT shadow-sm border border-outline-variant/30">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                filter_alt
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">Payment:</span>
              <select
                id="filter-payment"
                value={paymentFilter}
                onChange={(e) => {
                  setPaymentFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="bg-transparent font-label-md text-label-md font-semibold text-on-surface focus:outline-none cursor-pointer"
              >
                <option value="all">All Modes</option>
                <option value="cash">Cash Tender</option>
                <option value="card">Card Payment</option>
                <option value="upi">UPI / QR</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Ledger View */}
      <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/30 bg-surface-container-low/40 text-on-surface-variant font-label-sm text-label-sm">
                <th className="py-2.5 px-pad-md font-medium">Receipt #</th>
                <th className="py-2.5 px-pad-md font-medium">Customer Profile</th>
                <th className="py-2.5 px-pad-md font-medium">Basket Size</th>
                <th className="py-2.5 px-pad-md font-medium text-right">Net Total</th>
                <th className="py-2.5 px-pad-md font-medium">Payment Rail</th>
                <th className="py-2.5 px-pad-md font-medium">Timestamp</th>
                <th className="py-2.5 px-pad-md font-medium">Status</th>
                <th className="py-2.5 px-pad-md font-medium text-right">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 font-body-sm text-body-sm">
              {paginatedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-on-surface-variant">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[36px] text-outline-variant">
                        receipt
                      </span>
                      <p className="font-label-md text-label-md text-on-surface font-medium">
                        No billing receipts found
                      </p>
                      <p className="text-[12px] text-on-surface-variant max-w-xs">
                        Completed transactions will be archived here in real-time.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((inv) => {
                  const isSelected = selectedInvoiceId === inv.id
                  const isRefunded = inv.status === 'refunded'
                  return (
                    <tr
                      key={inv.id}
                      onClick={() => onSelectInvoice(inv)}
                      className={`hover:bg-surface-container-low transition-colors cursor-pointer ${
                        isSelected ? 'bg-secondary-container/20 font-medium' : ''
                      } ${isRefunded ? 'opacity-70 bg-surface-container-low/30' : ''}`}
                    >
                      <td className="py-3 px-pad-md font-mono-numeric-sm font-semibold text-on-surface">
                        {inv.id}
                      </td>
                      <td className="py-3 px-pad-md text-on-surface">
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
                      <td className="py-3 px-pad-md text-on-surface font-mono-numeric-sm">
                        {inv.paymentMethod}
                      </td>
                      <td className="py-3 px-pad-md text-on-surface-variant font-mono-numeric-sm">
                        {inv.date} {inv.timestamp}
                      </td>
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
                      <td className="py-3 px-pad-md text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectInvoice(inv)
                          }}
                          className="p-1 hover:bg-surface-container rounded-DEFAULT text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-pad-md bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-pad-sm font-label-sm text-label-sm text-on-surface-variant">
          <div>
            Showing {paginatedInvoices.length} of {filteredInvoices.length} invoices
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
            <span className="px-2 font-mono-numeric-sm text-on-surface">
              Page {currentPage} of {totalPages}
            </span>
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
    </div>
  )
}
