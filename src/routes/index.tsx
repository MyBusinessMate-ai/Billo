import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { PageHeader } from '../components/layout/PageHeader'
import { DashboardMetrics } from '../components/dashboard/DashboardMetrics'
import { RapidCheckoutBanner } from '../components/dashboard/RapidCheckoutBanner'
import { RecentTransactionsTable } from '../components/dashboard/RecentTransactionsTable'
import { InvoiceDetailsDrawer } from '../components/history/InvoiceDetailsDrawer'
import { ThermalReceiptModal } from '../components/billing/ThermalReceiptModal'
import type { BillingInvoice } from '../types/pos'

export const Route = createFileRoute('/')({
  component: DashboardPage,
})

function DashboardPage() {
  const navigate = useNavigate()

  const [selectedInvoice, setSelectedInvoice] = useState<BillingInvoice | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [printInvoice, setPrintInvoice] = useState<BillingInvoice | null>(null)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)

  const handleViewInvoice = (inv: BillingInvoice) => {
    setSelectedInvoice(inv)
    setIsDrawerOpen(true)
  }

  const handlePrintInvoice = (inv: BillingInvoice) => {
    setPrintInvoice(inv)
    setIsReceiptModalOpen(true)
  }

  return (
    <AppLayout>
      <PageHeader
        title="Dashboard"
        subtitle="Daily store performance & billing overview"
        actions={
          <button
            id="btn-start-billing-top"
            type="button"
            onClick={() => navigate({ to: '/billing' })}
            className="h-button-h-md px-pad-md bg-primary text-on-primary hover:bg-primary-container rounded-DEFAULT font-label-md text-label-md flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Start Billing</span>
            <kbd className="ml-1 font-mono-numeric-sm text-[10px] bg-white/20 px-1 py-0.5 rounded text-white leading-none">
              F1
            </kbd>
          </button>
        }
      />

      {/* Compact Rational Metric Strip */}
      <DashboardMetrics />

      {/* Operational Primary Banner Bar */}
      <RapidCheckoutBanner />

      {/* Recent Transactions Ledger Structure */}
      <RecentTransactionsTable
        onViewInvoice={handleViewInvoice}
        onPrintInvoice={handlePrintInvoice}
      />

      {/* Invoice Details Drawer */}
      <InvoiceDetailsDrawer
        invoice={selectedInvoice}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onOpenReceipt={(inv) => {
          setIsDrawerOpen(false)
          handlePrintInvoice(inv)
        }}
      />

      {/* Thermal Receipt Print Modal */}
      <ThermalReceiptModal
        invoice={printInvoice}
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
      />
    </AppLayout>
  )
}
