import React, { useState } from 'react'
import { usePOS } from '../../context/POSContext'
import { formatINR } from '../../utils/formatters'
import { DateRangeFilter } from '../common/DateRangeFilter'
import { matchesDateFilter, getDateFilterLabel, type DateFilterState } from '../../utils/dateFilter'

export const DashboardMetrics: React.FC = () => {
  const { settings, invoices, customers, currentDate } = usePOS()
  const [dateFilter, setDateFilter] = useState<DateFilterState>({ type: 'all' })

  const completedInvoices = invoices.filter((i) => i.status === 'completed')

  // Filter completed invoices according to selected date period
  const filteredCompletedInvoices = completedInvoices.filter((inv) =>
    matchesDateFilter(inv.date, dateFilter, currentDate)
  )

  const totalBillings = filteredCompletedInvoices.reduce((sum, i) => sum + i.netTotal, 0)
  const ordersCount = filteredCompletedInvoices.length
  const averageOrderValue = ordersCount > 0 ? totalBillings / ordersCount : 0

  // Count active customers in period (or directory count if All Time)
  const periodCustomerSet = new Set(
    filteredCompletedInvoices.map(
      (i) =>
        i.customer.id ||
        (i.customer.phone && i.customer.phone !== '—' ? i.customer.phone : i.customer.name)
    )
  )
  const displayCustomersCount =
    dateFilter.type === 'all' ? customers.length : periodCustomerSet.size

  const activePeriodLabel = getDateFilterLabel(dateFilter)

  return (
    <div className="bg-surface-container-lowest rounded-DEFAULT p-pad-md shadow-sm space-y-pad-md">
      {/* Metrics Header with Filter Dropdown */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-outline-variant/20">
        <div className="flex items-center gap-2">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface font-bold">
            Performance Metrics
          </span>
          <span className="text-[11px] font-mono-numeric-sm px-2 py-0.5 rounded-DEFAULT bg-surface-container text-on-surface-variant font-medium">
            Period: {activePeriodLabel}
          </span>
        </div>

        {/* Date Filter Dropdown Panel */}
        <DateRangeFilter
          filter={dateFilter}
          onChange={setDateFilter}
          referenceDate={currentDate}
          align="right"
        />
      </div>

      {/* Metric Cards Grid */}
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
            <div className="flex items-center gap-1.5 mt-1 font-mono-numeric-sm text-mono-numeric-sm text-secondary font-medium">
              <span className="material-symbols-outlined text-[14px]">receipt_long</span>
              <span>
                {ordersCount} {ordersCount === 1 ? 'Order' : 'Orders'} Settled
              </span>
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
              <span>
                {displayCustomersCount} {displayCustomersCount === 1 ? 'Customer' : 'Customers'}
              </span>
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
              {displayCustomersCount} {displayCustomersCount === 1 ? 'Customer' : 'Customers'}
            </div>
            <div className="flex items-center gap-1.5 mt-1 font-mono-numeric-sm text-mono-numeric-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-[14px]">contacts</span>
              <span>{dateFilter.type === 'all' ? 'Active Directory' : 'Transacted in Period'}</span>
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
              {settings.taxRatePercent !== undefined && settings.taxRatePercent > 0
                ? `${settings.taxRatePercent}% GST`
                : '0% GST'}
            </div>
            <div className="flex items-center gap-1.5 mt-1 font-mono-numeric-sm text-mono-numeric-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-[14px]">tune</span>
              <span className="truncate">
                {settings.gstin && settings.gstin !== '0'
                  ? `GSTIN: ${settings.gstin}`
                  : settings.taxRatePercent && settings.taxRatePercent > 0
                    ? 'Standard Rate'
                    : 'No Tax Configured'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
