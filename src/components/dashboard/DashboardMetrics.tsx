import React from 'react'
import { usePOS } from '../../context/POSContext'
import { formatINR } from '../../utils/formatters'

export const DashboardMetrics: React.FC = () => {
  const { settings, invoices, customers } = usePOS()

  const completedInvoices = invoices.filter((i) => i.status === 'completed')
  const totalBillings = completedInvoices.reduce((sum, i) => sum + i.netTotal, 0)
  const averageOrderValue =
    completedInvoices.length > 0 ? totalBillings / completedInvoices.length : 0

  return (
    <div className="bg-surface-container-lowest rounded-DEFAULT p-pad-md shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-pad-md divide-y lg:divide-y-0 sm:divide-x-0">
        {/* Metric 1: Total Billings */}
        <div className="flex flex-col justify-between pr-0 lg:pr-pad-md">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="font-label-sm text-label-sm uppercase tracking-wider">
              Total Revenue
            </span>
            <span className="material-symbols-outlined text-[18px] text-secondary">payments</span>
          </div>
          <div className="mt-2">
            <div className="font-mono-numeric-lg text-mono-numeric-lg text-on-surface tracking-tight font-semibold">
              {formatINR(totalBillings)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 font-mono-numeric-sm text-mono-numeric-sm text-secondary">
              <span className="material-symbols-outlined text-[14px]">receipt_long</span>
              <span>{completedInvoices.length} Orders Settled</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Average Order Value */}
        <div className="flex flex-col justify-between pt-pad-sm lg:pt-0 lg:px-pad-md">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="font-label-sm text-label-sm uppercase tracking-wider">
              Average Order Value (AOV)
            </span>
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
              shopping_cart
            </span>
          </div>
          <div className="mt-2">
            <div className="font-mono-numeric-lg text-mono-numeric-lg text-on-surface tracking-tight font-semibold">
              {formatINR(averageOrderValue)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 font-mono-numeric-sm text-mono-numeric-sm text-on-surface-variant">
              <span>{customers.length} Customers</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Total Customers */}
        <div className="flex flex-col justify-between pt-pad-sm lg:pt-0 lg:px-pad-md">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="font-label-sm text-label-sm uppercase tracking-wider">
              Total Customers
            </span>
            <span className="material-symbols-outlined text-[18px] text-secondary">group</span>
          </div>
          <div className="mt-2">
            <div className="font-mono-numeric-lg text-mono-numeric-lg text-on-surface tracking-tight font-semibold">
              {customers.length} Customers
            </div>
            <div className="flex items-center gap-1.5 mt-1 font-mono-numeric-sm text-mono-numeric-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-[14px]">contacts</span>
              <span>Active Directory</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Store Config & Tax Rate */}
        <div className="flex flex-col justify-between pt-pad-sm lg:pt-0 lg:pl-pad-md">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="font-label-sm text-label-sm uppercase tracking-wider">
              GST / Tax Standard
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-DEFAULT text-[10px] font-mono-numeric-sm bg-secondary-container text-on-secondary-container font-semibold">
              Live Config
            </span>
          </div>
          <div className="mt-2">
            <div className="font-mono-numeric-lg text-mono-numeric-lg text-on-surface font-semibold">
              {settings.taxRatePercent ?? 5}% GST
            </div>
            <div className="flex items-center gap-1.5 mt-1 font-mono-numeric-sm text-mono-numeric-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-[14px]">tune</span>
              <span className="truncate">
                {settings.gstin && settings.gstin !== '0'
                  ? `GSTIN: ${settings.gstin}`
                  : 'Standard Rate'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
