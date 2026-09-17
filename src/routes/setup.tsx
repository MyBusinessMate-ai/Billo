import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { CategoryFieldManager } from '../components/setup/CategoryFieldManager'
import { BillingRulesManager } from '../components/setup/BillingRulesManager'
import { usePOS } from '../context/POSContext'

export const Route = createFileRoute('/setup')({
  component: SetupPage,
})

function SetupPage() {
  const { settings, categories } = usePOS()
  const [activeTab, setActiveTab] = useState<'categories_fields' | 'billing_rules' | 'profile'>(
    'categories_fields'
  )

  return (
    <AppLayout>
      <div className="space-y-pad-lg max-w-6xl">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-pad-md pb-pad-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display-lg text-display-lg text-on-surface tracking-tight">
                SaaS Business Setup
              </span>
              <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded text-[11px] font-mono font-semibold uppercase tracking-wider">
                Multi-Tenant
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
              Customize categories, dynamic product fields, GST tax models, and checkout ledger
              policies.
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 border-b border-outline-variant/30 pb-px">
          <button
            type="button"
            onClick={() => setActiveTab('categories_fields')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-DEFAULT font-label-md text-label-md font-semibold transition-all border-b-2 cursor-pointer ${
              activeTab === 'categories_fields'
                ? 'border-primary text-primary bg-surface-container-low'
                : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low/50'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">category</span>
            <span>Categories & Product Fields</span>
            {categories && categories.length > 0 && (
              <span className="bg-primary text-on-primary text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full">
                {categories.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('billing_rules')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-DEFAULT font-label-md text-label-md font-semibold transition-all border-b-2 cursor-pointer ${
              activeTab === 'billing_rules'
                ? 'border-primary text-primary bg-surface-container-low'
                : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low/50'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">account_balance</span>
            <span>GST & Discount Rules</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-DEFAULT font-label-md text-label-md font-semibold transition-all border-b-2 cursor-pointer ${
              activeTab === 'profile'
                ? 'border-primary text-primary bg-surface-container-low'
                : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low/50'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">storefront</span>
            <span>Store Summary</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div>
          {activeTab === 'categories_fields' && <CategoryFieldManager />}

          {activeTab === 'billing_rules' && <BillingRulesManager />}

          {activeTab === 'profile' && (
            <div className="bg-surface-container-lowest p-pad-lg rounded-DEFAULT shadow-sm border border-outline-variant/30 space-y-pad-md max-w-3xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-DEFAULT bg-primary/15 text-primary flex items-center justify-center font-bold text-lg">
                  <span className="material-symbols-outlined text-[28px]">store</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">
                    {settings.storeName || 'Active SaaS Store Outlet'}
                  </h3>
                  <p className="text-xs text-on-surface-variant font-mono">
                    Outlet Code: {settings.outletCode || 'POS-01'} • GSTIN:{' '}
                    {settings.gstin || 'Not registered'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-pad-md pt-2 border-t border-outline-variant/20">
                <div className="p-3 bg-surface-container-low rounded-DEFAULT space-y-1">
                  <span className="text-[11px] font-semibold text-on-surface-variant uppercase">
                    Configured Custom Fields
                  </span>
                  <span className="font-mono-numeric-lg text-headline-sm font-bold text-on-surface block">
                    {categories.reduce((acc, c) => acc + (c.customFields?.length || 0), 0)} Fields
                  </span>
                  <span className="text-xs text-on-surface-variant block">
                    Category Dynamic Fields
                  </span>
                </div>

                <div className="p-3 bg-surface-container-low rounded-DEFAULT space-y-1">
                  <span className="text-[11px] font-semibold text-on-surface-variant uppercase">
                    Taxation Mode
                  </span>
                  <span className="font-mono-numeric-lg text-headline-sm font-bold text-secondary block">
                    {settings.billingRules?.enableItemGst
                      ? 'Per-Item GST'
                      : `${settings.taxRatePercent || 0}% Flat GST`}
                  </span>
                  <span className="text-xs text-on-surface-variant block">
                    Item discounts{' '}
                    {settings.billingRules?.enableItemDiscount !== false ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
