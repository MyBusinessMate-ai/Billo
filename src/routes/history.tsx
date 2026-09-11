import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { BillingHistoryTable } from '../components/history/BillingHistoryTable'
import { InvoiceDetailsDrawer } from '../components/history/InvoiceDetailsDrawer'
import { ThermalReceiptModal } from '../components/billing/ThermalReceiptModal'
import type { BillingInvoice } from '../types/pos'
import { usePOS } from '../context/POSContext'

export const Route = createFileRoute('/history')({
  component: BillingHistoryPage,
})

function BillingHistoryPage() {
  const { invoices } = usePOS()

  // Default selected invoice for side drawer (#INV-1024)
  const defaultInvoice = invoices.find((inv) => inv.id === '#INV-1024') || invoices[0] || null
  const [selectedInvoice, setSelectedInvoice] = useState<BillingInvoice | null>(defaultInvoice)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [printInvoice, setPrintInvoice] = useState<BillingInvoice | null>(null)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)

  const handleSelectInvoice = (inv: BillingInvoice) => {
    setSelectedInvoice(inv)
    setIsDrawerOpen(true)
  }

  const handleOpenReceipt = (inv: BillingInvoice) => {
    setPrintInvoice(inv)
    setIsReceiptModalOpen(true)
  }

  return (
    <AppLayout>
      <BillingHistoryTable
        onSelectInvoice={handleSelectInvoice}
        selectedInvoiceId={selectedInvoice?.id}
        onOpenReceipt={handleOpenReceipt}
      />

      {/* Invoice Details Drawer */}
      <InvoiceDetailsDrawer
        invoice={selectedInvoice}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onOpenReceipt={handleOpenReceipt}
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
