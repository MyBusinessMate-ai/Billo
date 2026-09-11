import React, { useState, useEffect, useRef } from 'react'
import type { Customer, BillingInvoice } from '../../types/pos'
import { usePOS } from '../../context/POSContext'
import { CustomerDossierDrawer } from './CustomerDossierDrawer'
import { ThermalReceiptModal } from '../billing/ThermalReceiptModal'
import { formatINR } from '../../utils/formatters'

interface CustomerDirectoryTableProps {
  onRegisterClick?: () => void
}

export const CustomerDirectoryTable: React.FC<CustomerDirectoryTableProps> = () => {
  const { customers, invoices } = usePOS()
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [tabFilter, setTabFilter] = useState<'all' | 'frequent' | 'new' | 'inactive'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedCustomerForDrawer, setSelectedCustomerForDrawer] = useState<Customer | null>(null)
  const [selectedInvoiceForReceipt, setSelectedInvoiceForReceipt] = useState<BillingInvoice | null>(
    null
  )
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)
  const rowsPerPage = 10

  // Keyboard shortcut Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Helper to get real live invoices for a customer from database state
  const getCustomerInvoices = (cust: Customer): BillingInvoice[] => {
    const cleanCustomerPhone = cust.phone ? cust.phone.replace(/\D/g, '') : ''
    return invoices.filter((inv) => {
      // 1. Direct customer ID match
      if (inv.customer?.id && cust.id && inv.customer.id === cust.id) return true

      // 2. Phone match (flexible matching for formats, suffixes, or substring)
      if (cleanCustomerPhone && inv.customer?.phone) {
        const cleanInvPhone = inv.customer.phone.replace(/\D/g, '')
        if (cleanInvPhone && cleanCustomerPhone) {
          if (cleanInvPhone === cleanCustomerPhone) return true
          if (cleanInvPhone.length >= 7 && cleanCustomerPhone.length >= 7) {
            if (
              cleanInvPhone.endsWith(cleanCustomerPhone) ||
              cleanCustomerPhone.endsWith(cleanInvPhone)
            )
              return true
          }
          if (
            cleanInvPhone.length >= 4 &&
            (cleanInvPhone.includes(cleanCustomerPhone) ||
              cleanCustomerPhone.includes(cleanInvPhone))
          )
            return true
        }
      }

      // 3. Email match
      if (
        cust.email &&
        cust.email.trim() &&
        inv.customer?.email &&
        inv.customer.email.trim() &&
        cust.email.trim().toLowerCase() === inv.customer.email.trim().toLowerCase()
      ) {
        return true
      }

      // 4. Exact Customer Name match (ignoring generic labels)
      if (cust.name && inv.customer?.name) {
        const cName = cust.name.trim().toLowerCase()
        const invName = inv.customer.name.trim().toLowerCase()
        const genericNames = ['walk-in customer', 'walk-in', 'customer', 'loyalty customer', '']
        if (!genericNames.includes(cName) && cName === invName) {
          return true
        }
      }
      return false
    })
  }

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.trim().toLowerCase()
    const cleanDigits = q.replace(/\D/g, '')
    const cleanPhone = c.phone.replace(/\D/g, '')

    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      (cleanDigits.length > 0 && cleanPhone.includes(cleanDigits)) ||
      c.phone.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      c.id.toLowerCase().replace('-', '').includes(q.replace('-', ''))

    const custInvs = getCustomerInvoices(c)
    const totalVisits = custInvs.length > 0 ? custInvs.length : c.visits || 0

    const matchesTab =
      tabFilter === 'all'
        ? true
        : tabFilter === 'frequent'
          ? totalVisits >= 3
          : tabFilter === 'new'
            ? totalVisits <= 1
            : c.isInactive

    return matchesSearch && matchesTab
  })

  const totalPages = Math.ceil(filteredCustomers.length / rowsPerPage) || 1
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  )

  const handleViewCustomerHistory = (cust: Customer, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedCustomerForDrawer(cust)
  }

  return (
    <>
      {/* Filter & Operational Toolbar */}
      <div className="bg-surface-container-lowest p-pad-sm rounded-DEFAULT shadow-sm space-y-pad-sm border border-outline-variant/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-pad-sm">
          {/* Live Search Bar */}
          <div className="relative flex-1 max-w-xl">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]">search</span>
            </div>
            <input
              ref={searchInputRef}
              id="customer-search-input"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchQuery('')
                  searchInputRef.current?.blur()
                }
              }}
              className="p-2 w-full h-button-md pl-9 pr-14 bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/70 rounded-DEFAULT font-body-sm text-body-sm focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary transition-all border border-outline-variant/30"
              placeholder="Search by Customer Name, Phone Number, or Email..."
              type="text"
            />
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center">
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono-numeric-sm font-semibold text-on-surface-variant bg-surface-container rounded border border-outline-variant/50">
                Ctrl + K
              </kbd>
            </div>
          </div>

          {/* Metric Indicator */}
          <div className="flex items-center gap-pad-xs self-end lg:self-auto">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Ledger:</span>
            <span className="p-2 font-mono-numeric-sm text-mono-numeric-sm font-semibold text-on-surface bg-surface-container px-2 py-1 rounded">
              {customers.length} Recorded
            </span>
          </div>
        </div>

        {/* Segment Tabs & Mode Selectors */}
        <div className="flex flex-wrap items-center justify-between gap-pad-xs pt-1">
          <div className="flex flex-wrap items-center gap-1.5" id="filter-tabs">
            <button
              type="button"
              onClick={() => setTabFilter('all')}
              className={`p-2 h-button-sm px-3 rounded-DEFAULT font-label-sm text-label-sm transition-colors shadow-sm cursor-pointer ${
                tabFilter === 'all'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="p-2">All Customers ({customers.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setTabFilter('frequent')}
              className={`p-2 h-button-sm px-3 rounded-DEFAULT font-label-sm text-label-sm transition-colors cursor-pointer ${
                tabFilter === 'frequent'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="p-2">Frequent Shoppers (3+ Visits)</span>
            </button>
            <button
              type="button"
              onClick={() => setTabFilter('new')}
              className={`p-2 h-button-sm px-3 rounded-DEFAULT font-label-sm text-label-sm transition-colors cursor-pointer ${
                tabFilter === 'new'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="p-2">New Customers</span>
            </button>
            <button
              type="button"
              onClick={() => setTabFilter('inactive')}
              className={`p-2 h-button-sm px-3 rounded-DEFAULT font-label-sm text-label-sm transition-colors cursor-pointer ${
                tabFilter === 'inactive'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="p-2">Inactive</span>
            </button>
          </div>
        </div>
      </div>

      {/* Master Customer Ledger Table */}
      <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm overflow-hidden border border-outline-variant/30">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left" id="customer-table">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider select-none border-b border-outline-variant/30">
                <th className="pl-pad-md pr-pad-sm py-3.5 font-semibold" scope="col">
                  Customer Profile
                </th>
                <th className="px-pad-sm py-3.5 font-semibold" scope="col">
                  Contact Details
                </th>
                <th className="px-pad-sm py-3.5 text-right font-semibold" scope="col">
                  Visits
                </th>
                <th className="px-pad-sm py-3.5 text-right font-semibold" scope="col">
                  Total Spend
                </th>
                <th className="px-pad-sm py-3.5 font-semibold" scope="col">
                  Last Visit
                </th>
                <th className="pl-pad-sm pr-pad-md py-3.5 text-right font-semibold" scope="col">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 text-on-surface font-body-sm text-body-sm">
              {paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-on-surface-variant">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[36px] text-outline-variant">
                        person_search
                      </span>
                      <p className="font-label-md text-label-md text-on-surface font-medium">
                        No customers found
                      </p>
                      <p className="text-[12px] text-on-surface-variant max-w-xs">
                        Registered customer accounts will appear here automatically when billing.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((cust, idx) => {
                  const initials = cust.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase()

                  const custInvoices = getCustomerInvoices(cust)
                  const computedTotalSpend =
                    custInvoices.length > 0
                      ? custInvoices.reduce((sum, inv) => sum + (inv.netTotal || 0), 0)
                      : cust.totalSpend || 0

                  const computedVisits =
                    custInvoices.length > 0 ? custInvoices.length : cust.visits || 0

                  const isAlternate = idx % 2 === 1

                  return (
                    <tr
                      key={cust.id}
                      onClick={() => setSelectedCustomerForDrawer(cust)}
                      className={`h-16 hover:bg-surface-container-low/70 transition-colors group cursor-pointer ${
                        isAlternate ? 'bg-surface-container-low/20' : ''
                      }`}
                    >
                      {/* Customer Profile: circular avatar and name */}
                      <td className="pl-pad-md pr-pad-sm py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full font-mono-numeric-sm font-semibold flex items-center justify-center flex-shrink-0 bg-surface-container text-on-surface shadow-2xs">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-label-md text-label-md font-semibold text-on-surface">
                              {cust.name}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact Details: Phone */}
                      <td className="px-pad-sm py-3.5">
                        <div className="flex flex-col">
                          <span className="font-mono-numeric-sm text-mono-numeric-sm text-on-surface font-medium">
                            {cust.phone}
                          </span>
                        </div>
                      </td>

                      {/* Visits: Just the visit number */}
                      <td className="px-pad-sm py-3.5 text-right">
                        <span className="font-mono-numeric-md text-mono-numeric-md font-semibold text-on-surface">
                          {computedVisits}
                        </span>
                      </td>

                      {/* Total Spend: Sum of all invoices */}
                      <td className="px-pad-sm py-3.5 text-right">
                        <span className="font-mono-numeric-md text-mono-numeric-md font-semibold text-on-surface">
                          {formatINR(computedTotalSpend)}
                        </span>
                      </td>

                      {/* Last Visit */}
                      <td className="px-pad-sm py-3.5">
                        <span className="font-mono-numeric-sm text-mono-numeric-sm text-on-surface font-medium">
                          {cust.lastVisit || '—'}
                        </span>
                      </td>

                      {/* Actions: Open History Drawer */}
                      <td className="pl-pad-sm pr-pad-md py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            className="h-8 px-3 bg-surface-container-low hover:bg-surface-container text-on-surface rounded-DEFAULT font-label-sm text-label-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-outline-variant/30 shadow-2xs"
                            title="View Transaction History in Side Panel"
                            type="button"
                            onClick={(e) => handleViewCustomerHistory(cust, e)}
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              receipt_long
                            </span>
                            <span>History</span>
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

        {/* Pagination & Operational Footer */}
        <div className="px-pad-md py-3.5 bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-pad-sm border-t border-outline-variant/30">
          <div className="flex items-center gap-2">
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Showing{' '}
              <span className="font-mono-numeric-sm font-semibold text-on-surface">
                {paginatedCustomers.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}–
                {Math.min(currentPage * rowsPerPage, filteredCustomers.length)}
              </span>{' '}
              of{' '}
              <span className="font-mono-numeric-sm font-semibold text-on-surface">
                {filteredCustomers.length}
              </span>{' '}
              customers
            </span>
            <span className="w-1 h-1 rounded-full bg-on-surface-variant/40" />
            <span className="font-mono-numeric-sm text-[11px] text-on-surface-variant">
              Page {currentPage} of {totalPages}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              className={`h-button-sm px-2.5 rounded-DEFAULT font-label-sm text-label-sm flex items-center gap-1 border border-outline-variant/30 ${
                currentPage === 1
                  ? 'bg-surface-container-lowest text-on-surface-variant/40 cursor-not-allowed'
                  : 'bg-surface-container-lowest hover:bg-surface-container text-on-surface cursor-pointer shadow-sm'
              }`}
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              <span>Previous</span>
            </button>
            <div className="flex items-center gap-1 px-1">
              <button
                className={`w-7 h-7 rounded-DEFAULT font-mono-numeric-sm text-mono-numeric-sm font-medium ${
                  currentPage === 1
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-lowest hover:bg-surface-container text-on-surface cursor-pointer border border-outline-variant/30'
                }`}
                type="button"
                onClick={() => setCurrentPage(1)}
              >
                1
              </button>
              {totalPages > 1 && (
                <button
                  className={`w-7 h-7 rounded-DEFAULT font-mono-numeric-sm text-mono-numeric-sm transition-colors ${
                    currentPage === 2
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-lowest hover:bg-surface-container text-on-surface cursor-pointer border border-outline-variant/30'
                  }`}
                  type="button"
                  onClick={() => setCurrentPage(2)}
                >
                  2
                </button>
              )}
              {totalPages > 2 && (
                <button
                  className={`w-7 h-7 rounded-DEFAULT font-mono-numeric-sm text-mono-numeric-sm transition-colors ${
                    currentPage === 3
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-lowest hover:bg-surface-container text-on-surface cursor-pointer border border-outline-variant/30'
                  }`}
                  type="button"
                  onClick={() => setCurrentPage(3)}
                >
                  3
                </button>
              )}
              {totalPages > 4 && (
                <span className="text-on-surface-variant px-1 font-mono-numeric-sm text-[11px]">
                  ...
                </span>
              )}
              {totalPages > 3 && (
                <button
                  className={`w-7 h-7 rounded-DEFAULT font-mono-numeric-sm text-mono-numeric-sm transition-colors ${
                    currentPage === totalPages
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-lowest hover:bg-surface-container text-on-surface cursor-pointer border border-outline-variant/30'
                  }`}
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                >
                  {totalPages}
                </button>
              )}
            </div>
            <button
              className={`h-button-sm px-2.5 rounded-DEFAULT font-label-sm text-label-sm flex items-center gap-1 border border-outline-variant/30 ${
                currentPage >= totalPages
                  ? 'bg-surface-container-lowest text-on-surface-variant/40 cursor-not-allowed'
                  : 'bg-surface-container-lowest hover:bg-surface-container text-on-surface cursor-pointer shadow-sm'
              }`}
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              type="button"
            >
              <span>Next</span>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Slide-out Dossier Drawer */}
      <CustomerDossierDrawer
        customer={selectedCustomerForDrawer}
        isOpen={!!selectedCustomerForDrawer}
        onClose={() => setSelectedCustomerForDrawer(null)}
        onSelectInvoice={(inv) => {
          setSelectedInvoiceForReceipt(inv)
          setIsReceiptModalOpen(true)
        }}
      />

      {/* Thermal Receipt Print Modal for inspection */}
      <ThermalReceiptModal
        invoice={selectedInvoiceForReceipt}
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
      />
    </>
  )
}
