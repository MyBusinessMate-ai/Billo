import React, { useState, useEffect } from 'react'
import type { BillingRulesConfig } from '../../types/pos'
import { usePOS } from '../../context/POSContext'

export const BillingRulesManager: React.FC = () => {
  const { settings, updateSettings, showToast } = usePOS()

  const currentRules: BillingRulesConfig = settings.billingRules || {
    enableItemGst: false,
    defaultGstPercent: typeof settings.taxRatePercent === 'number' ? settings.taxRatePercent : 0,
    requireGstin: false,
    enableItemDiscount: true,
    enableInvoiceDiscount: true,
    maxDiscountPercent: 50,
    enableCustomFieldsInBilling: true,
  }

  const [rules, setRules] = useState<BillingRulesConfig>(currentRules)

  useEffect(() => {
    if (settings.billingRules) {
      setRules({
        ...currentRules,
        ...settings.billingRules,
      })
    }
  }, [settings.billingRules])

  const handleToggle = (key: keyof BillingRulesConfig) => {
    const next = {
      ...rules,
      [key]: !rules[key],
    }
    setRules(next)
    updateSettings({ billingRules: next })
    showToast('Billing rule updated', 'success')
  }

  const handleRateChange = (val: number) => {
    const next = {
      ...rules,
      defaultGstPercent: val,
    }
    setRules(next)
    updateSettings({
      billingRules: next,
      taxRatePercent: val,
    })
    showToast(`Store default GST updated to ${val}%`, 'success')
  }

  const handleMaxDiscountChange = (val: number) => {
    const next = {
      ...rules,
      maxDiscountPercent: val,
    }
    setRules(next)
    updateSettings({ billingRules: next })
  }

  return (
    <div className="space-y-pad-lg max-w-4xl">
      {/* Banner */}
      <div className="pb-pad-sm border-b border-outline-variant/30">
        <h2 className="font-headline-sm text-headline-sm text-on-surface">
          Billing & Tax Policy Setup
        </h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
          Configure business tax rules, line-item GST options, and discount controls for your SaaS
          tenants.
        </p>
      </div>

      {/* Tax / GST Section */}
      <div className="bg-surface-container-lowest p-pad-md rounded-DEFAULT shadow-sm border border-outline-variant/30 space-y-pad-md">
        <div className="flex items-center gap-2 pb-2 border-b border-outline-variant/20">
          <span className="material-symbols-outlined text-secondary text-[22px]">
            account_balance
          </span>
          <div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">GST & Tax Rules</h3>
            <p className="text-xs text-on-surface-variant">
              Manage item-level GST rates and default store taxation
            </p>
          </div>
        </div>

        {/* Toggle 1: Item-level GST */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-surface-container-low rounded-DEFAULT border border-outline-variant/30">
          <div className="space-y-0.5">
            <span className="font-label-md text-label-md font-semibold text-on-surface block">
              Enable Per-Item GST Calculation
            </span>
            <span className="text-xs text-on-surface-variant block">
              When enabled, each product can have its own individual GST rate (e.g. 0%, 5%, 12%,
              18%, 28%) instead of one flat rate for the whole bill.
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleToggle('enableItemGst')}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              rules.enableItemGst ? 'bg-primary' : 'bg-surface-container-highest'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                rules.enableItemGst ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Store Default GST Selector */}
        <div className="space-y-2">
          <label className="block font-label-md text-label-md text-on-surface font-semibold">
            Store Standard GST Rate (%)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            {[0, 3, 5, 12, 18, 28].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => handleRateChange(rate)}
                className={`py-2 px-3 rounded-DEFAULT font-mono text-xs font-semibold border transition-all cursor-pointer ${
                  rules.defaultGstPercent === rate
                    ? 'border-primary bg-primary text-on-primary shadow-2xs'
                    : 'border-outline-variant/30 bg-surface-container-low hover:bg-surface-container text-on-surface'
                }`}
              >
                {rate}% GST
              </button>
            ))}
          </div>
        </div>

        {/* Toggle 2: Require GSTIN on invoices */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-surface-container-low rounded-DEFAULT border border-outline-variant/30">
          <div className="space-y-0.5">
            <span className="font-label-md text-label-md font-semibold text-on-surface block">
              Prompt for Customer GSTIN
            </span>
            <span className="text-xs text-on-surface-variant block">
              Enable B2B customer GSTIN number input on customer directory and billing drawer.
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleToggle('requireGstin')}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              rules.requireGstin ? 'bg-primary' : 'bg-surface-container-highest'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                rules.requireGstin ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Discount Policy Section */}
      <div className="bg-surface-container-lowest p-pad-md rounded-DEFAULT shadow-sm border border-outline-variant/30 space-y-pad-md">
        <div className="flex items-center gap-2 pb-2 border-b border-outline-variant/20">
          <span className="material-symbols-outlined text-secondary text-[22px]">percent</span>
          <div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">
              Discount Controls & Permissions
            </h3>
            <p className="text-xs text-on-surface-variant">
              Configure whether items or invoices can have discounts during checkout
            </p>
          </div>
        </div>

        {/* Toggle 3: Item-level Discount */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-surface-container-low rounded-DEFAULT border border-outline-variant/30">
          <div className="space-y-0.5">
            <span className="font-label-md text-label-md font-semibold text-on-surface block">
              Allow Line-Item Discounts
            </span>
            <span className="text-xs text-on-surface-variant block">
              Allows cashiers to apply individual flat or percentage discounts to specific line
              items directly in the checkout ledger.
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleToggle('enableItemDiscount')}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              rules.enableItemDiscount ? 'bg-primary' : 'bg-surface-container-highest'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                rules.enableItemDiscount ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Toggle 4: Invoice-level Discount */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-surface-container-low rounded-DEFAULT border border-outline-variant/30">
          <div className="space-y-0.5">
            <span className="font-label-md text-label-md font-semibold text-on-surface block">
              Allow Overall Bill Discounts
            </span>
            <span className="text-xs text-on-surface-variant block">
              Allows applying total invoice discounts (e.g. promo codes, store vouchers, flat rupee
              rebates) on final settlement.
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleToggle('enableInvoiceDiscount')}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              rules.enableInvoiceDiscount ? 'bg-primary' : 'bg-surface-container-highest'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                rules.enableInvoiceDiscount ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Max Discount Limit */}
        <div className="space-y-1">
          <label className="block font-label-md text-label-md text-on-surface font-semibold">
            Maximum Allowed Discount Cap (%)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="0"
              max="100"
              value={rules.maxDiscountPercent ?? 50}
              onChange={(e) =>
                handleMaxDiscountChange(
                  Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0))
                )
              }
              className="w-32 h-10 px-3 bg-surface-container-low border border-outline-variant/40 rounded-DEFAULT text-on-surface font-mono-numeric-md font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-xs text-on-surface-variant">
              Prevents cashier entry errors exceeding this percentage cap
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
