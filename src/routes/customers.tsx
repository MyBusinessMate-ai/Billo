import { createFileRoute } from '@tanstack/react-router'
import { AppLayout } from '../components/layout/AppLayout'
import { CustomerDirectoryTable } from '../components/customers/CustomerDirectoryTable'
import { usePOS } from '../context/POSContext'

export const Route = createFileRoute('/customers')({
  component: CustomerDetailsPage,
})

function CustomerDetailsPage() {
  const { customers, showToast } = usePOS()

  const handleExportList = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Customer ID,Name,Phone,Email,Visits,Total Spend']
        .concat(
          customers.map(
            (c) => `"${c.id}","${c.name}","${c.phone}","${c.email}",${c.visits},${c.totalSpend}`
          )
        )
        .join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `LedgerPOS_Customers_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Exported customer CRM registry CSV', 'success')
  }

  return (
    <AppLayout>
      {/* Top KPI & Action Deck */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-pad-md pb-pad-xs">
        <div>
          <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight">
            Customer Directory
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
            Comprehensive retail profiles, purchase records, and settlement histories.
          </p>
        </div>
        <div className="flex items-center gap-pad-xs">
          <button
            onClick={handleExportList}
            className="p-2 h-button-md px-pad-md bg-surface-container-low hover:bg-surface-container text-on-surface rounded-DEFAULT font-label-md text-label-md flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
              file_download
            </span>
            <span className="p-2">Export Customer List</span>
          </button>
        </div>
      </div>

      {/* Master Customer Ledger Table */}
      <CustomerDirectoryTable />
    </AppLayout>
  )
}
