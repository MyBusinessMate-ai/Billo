import React from 'react'
import { usePOS } from '../../context/POSContext'
import { formatINR } from '../../utils/formatters'

export const CustomerMetrics: React.FC = () => {
  const { customers, invoices } = usePOS()

  const completedInvoices = invoices.filter((i) => i.status === 'completed')
  const totalRevenue = completedInvoices.reduce((s, i) => s + i.netTotal, 0)

  const frequentCount = customers.filter((c) => c.visits >= 3).length
  const newCount = customers.filter((c) => (c.visits || 0) <= 1).length

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-pad-md">
      {/* Total Accounts */}
      <div className="bg-surface-container-lowest p-pad-md rounded-DEFAULT shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-on-surface-variant">
          <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">
            Registered Customers
          </span>
          <span className="material-symbols-outlined text-[20px] text-secondary">groups</span>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="font-mono-numeric-lg text-mono-numeric-lg text-on-surface font-semibold">
            {customers.length}
          </span>
          <span className="font-mono-numeric-sm text-mono-numeric-sm text-secondary font-medium flex items-center">
            {newCount} New
          </span>
        </div>
      </div>

      {/* Frequent Shoppers */}
      <div className="bg-surface-container-lowest p-pad-md rounded-DEFAULT shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-on-surface-variant">
          <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">
            Frequent Shoppers (3+ Visits)
          </span>
          <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
            shopping_bag
          </span>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="font-mono-numeric-lg text-mono-numeric-lg text-on-surface font-semibold">
            {frequentCount}
          </span>
          <span className="font-mono-numeric-sm text-mono-numeric-sm text-on-surface-variant">
            Loyalty Tier
          </span>
        </div>
      </div>

      {/* Cumulative Gross Billings */}
      <div className="bg-surface-container-lowest p-pad-md rounded-DEFAULT shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-on-surface-variant">
          <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">
            Gross POS Sales
          </span>
          <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
            payments
          </span>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="font-mono-numeric-lg text-mono-numeric-lg text-on-surface font-semibold">
            {formatINR(totalRevenue)}
          </span>
          <span className="font-mono-numeric-sm text-mono-numeric-sm text-secondary font-medium">
            {completedInvoices.length} Bills
          </span>
        </div>
      </div>

      {/* Total Settled Invoices */}
      <div className="bg-surface-container-lowest p-pad-md rounded-DEFAULT shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-on-surface-variant">
          <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">
            Total Invoices Settled
          </span>
          <span className="material-symbols-outlined text-[20px] text-secondary">receipt_long</span>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="font-mono-numeric-lg text-mono-numeric-lg text-on-surface font-semibold">
            {completedInvoices.length}
          </span>
          <span className="font-mono-numeric-sm text-mono-numeric-sm text-on-surface-variant">
            Recorded Bills
          </span>
        </div>
      </div>
    </div>
  )
}
