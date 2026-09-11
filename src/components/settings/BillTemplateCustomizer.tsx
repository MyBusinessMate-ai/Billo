import React, { useState } from 'react'
import { ThermalReceiptModal } from '../billing/ThermalReceiptModal'
import type { BillingInvoice, BillTemplateConfig, StoreSettings } from '../../types/pos'

interface BillTemplateCustomizerProps {
  settings: StoreSettings
  onChange: (field: string, val: any) => void
}

const sampleInvoice: BillingInvoice = {
  id: '#INV-PREVIEW',
  numericId: 1048,
  customer: {
    name: 'Rajesh Sharma',
    phone: '+91 98765 43210',
    email: 'rajesh.sharma@example.com',
  },
  items: [
    {
      productId: 'sample-1',
      name: 'Organic Almond Milk 1L',
      category: 'Dairy',
      hsn: '04012000',
      price: 240,
      quantity: 2,
      total: 480,
    },
    {
      productId: 'sample-2',
      name: 'Artisan Sourdough Bread',
      category: 'Bakery',
      hsn: '19059020',
      price: 180,
      quantity: 1,
      total: 180,
    },
    {
      productId: 'sample-3',
      name: 'Cold Pressed Coconut Oil 500ml',
      category: 'Packaged Goods',
      hsn: '15131900',
      price: 320,
      quantity: 1,
      total: 320,
    },
  ],
  subtotal: 980,
  taxPercent: 5,
  taxAmount: 49,
  discountAmount: 50,
  discountCode: 'WELCOME50',
  netTotal: 979,
  date: new Date().toISOString().split('T')[0],
  timestamp: new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }),
  paymentMethod: 'UPI / PhonePe',
  status: 'completed',
}

export const BillTemplateCustomizer: React.FC<BillTemplateCustomizerProps> = ({
  settings,
  onChange,
}) => {
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)

  const template: BillTemplateConfig = {
    invoiceTitle: 'TAX INVOICE',
    invoiceSubtitle: '',
    showLogo: true,
    showAddress: true,
    showPhone: true,
    showGstin: true,
    showCustomerPhone: true,
    showCustomerEmail: true,
    showCategory: false,
    showHsn: false,
    showDiscount: true,
    showTaxBreakdown: true,
    showAmountInWords: false,
    showShipTo: false,
    showRemarks: true,
    showQrCode: true,
    showTerms: true,
    termsText:
      '1. Goods once sold can be exchanged within 7 days with original invoice.\n2. Warranty / guarantee as per manufacturer policy.',
    showCustomerSignature: false,
    showAuthorizedSignatory: true,
    signatoryText: `For ${settings.storeName || settings.businessName || 'Store Outlet'}`,
    showFooterNotice: true,
    footerNotice: 'Thank you for shopping with us!',
    itemLabel: 'Product / Item Description',
    qtyLabel: 'Qty',
    rateLabel: 'Rate (₹)',
    totalLabel: 'Total (₹)',
    ...(settings.billTemplate || {}),
  }

  const updateTmpl = (key: keyof BillTemplateConfig, val: any) => {
    const updated = {
      ...template,
      [key]: val,
    }
    onChange('billTemplate', updated)
  }

  return (
    <div className="bg-surface-container-lowest rounded-DEFAULT border border-outline-variant/40 p-pad-lg shadow-sm space-y-pad-md">
      {/* Header Block with Step & Full Preview Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-pad-sm border-b border-outline-variant/30 gap-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-on-surface text-[20px]">
            edit_document
          </span>
          <div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">
              Bill & Receipt Field Customizer
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant text-[11px] mt-0.5">
              Customize field titles, table columns, and document disclaimers for Thermal & 11" ×
              8.5" bills.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsPreviewModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-on-primary hover:bg-on-primary-fixed-variant rounded-DEFAULT font-label-sm text-label-sm font-semibold transition-colors cursor-pointer shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px] text-secondary-fixed">
              visibility
            </span>
            <span>
              Preview {settings.invoiceFormat === 'a4' ? '11" × 8.5" Invoice' : 'Thermal Bill'}{' '}
              Layout
            </span>
          </button>
        </div>
      </div>

      {/* Format Selection Row */}
      <div className="pb-pad-sm border-b border-outline-variant/20 space-y-2">
        <label className="block font-label-sm text-label-sm text-on-surface font-semibold">
          Default Billing & Receipt Print Format
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div
            onClick={() => onChange('invoiceFormat', 'thermal')}
            className={`flex items-center gap-2.5 p-2.5 px-3 rounded-DEFAULT border cursor-pointer transition-all ${
              settings.invoiceFormat === 'thermal' || !settings.invoiceFormat
                ? 'bg-secondary/10 border-secondary ring-1 ring-secondary'
                : 'bg-surface-container-lowest border-outline-variant/40 hover:bg-surface-container'
            }`}
          >
            <input
              type="radio"
              name="invoice-format-radio"
              checked={settings.invoiceFormat === 'thermal' || !settings.invoiceFormat}
              onChange={() => onChange('invoiceFormat', 'thermal')}
              className="accent-black cursor-pointer"
            />
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">
                receipt
              </span>
              <div className="min-w-0">
                <span className="font-label-md text-label-md font-semibold text-on-surface block leading-tight">
                  Thermal Receipt (80mm)
                </span>
                <span className="font-body-sm text-[11px] text-on-surface-variant truncate block">
                  Continuous roll thermal POS format
                </span>
              </div>
            </div>
          </div>

          <div
            onClick={() => onChange('invoiceFormat', 'a4')}
            className={`flex items-center gap-2.5 p-2.5 px-3 rounded-DEFAULT border cursor-pointer transition-all ${
              settings.invoiceFormat === 'a4'
                ? 'bg-secondary/10 border-secondary ring-1 ring-secondary'
                : 'bg-surface-container-lowest border-outline-variant/40 hover:bg-surface-container'
            }`}
          >
            <input
              type="radio"
              name="invoice-format-radio"
              checked={settings.invoiceFormat === 'a4'}
              onChange={() => onChange('invoiceFormat', 'a4')}
              className="accent-black cursor-pointer"
            />
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">
                description
              </span>
              <div className="min-w-0">
                <span className="font-label-md text-label-md font-semibold text-on-surface block leading-tight">
                  11" × 8.5" Commercial Invoice
                </span>
                <span className="font-body-sm text-[11px] text-on-surface-variant truncate block">
                  Full-sheet horizontal commercial tax invoice
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Header Titles & Branding Visibility */}
      <div className="pb-pad-sm border-b border-outline-variant/20 space-y-3">
        <span className="font-label-sm text-label-sm font-semibold text-on-surface uppercase tracking-wide">
          1. Document Header & Titles
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-pad-md">
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
              Invoice Title (Header Badge)
            </label>
            <input
              type="text"
              value={template.invoiceTitle || ''}
              onChange={(e) => updateTmpl('invoiceTitle', e.target.value)}
              placeholder="e.g. TAX INVOICE, RETAIL INVOICE, ESTIMATE"
              className="w-full p-2 px-3 bg-surface-container-lowest border border-outline-variant/60 rounded-DEFAULT font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs"
            />
          </div>

          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
              Header Subtitle / Tagline (Optional)
            </label>
            <input
              type="text"
              value={template.invoiceSubtitle || ''}
              onChange={(e) => updateTmpl('invoiceSubtitle', e.target.value)}
              placeholder="e.g. Downtown Outlet"
              className="w-full p-2 px-3 bg-surface-container-lowest border border-outline-variant/60 rounded-DEFAULT font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs"
            />
          </div>

          <div className="md:col-span-2 pt-1 grid grid-cols-2 sm:grid-cols-4 gap-3 text-body-sm">
            <label className="flex items-center gap-2 cursor-pointer text-on-surface select-none">
              <input
                type="checkbox"
                checked={template.showLogo !== false}
                onChange={(e) => updateTmpl('showLogo', e.target.checked)}
                className="accent-primary rounded cursor-pointer"
              />
              <span className="font-label-sm text-label-sm">Show Store Logo</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-on-surface select-none">
              <input
                type="checkbox"
                checked={template.showPhone !== false}
                onChange={(e) => updateTmpl('showPhone', e.target.checked)}
                className="accent-primary rounded cursor-pointer"
              />
              <span className="font-label-sm text-label-sm">Show Phone No</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-on-surface select-none">
              <input
                type="checkbox"
                checked={template.showGstin !== false}
                onChange={(e) => updateTmpl('showGstin', e.target.checked)}
                className="accent-primary rounded cursor-pointer"
              />
              <span className="font-label-sm text-label-sm">Show GSTIN</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-on-surface select-none">
              <input
                type="checkbox"
                checked={template.showAddress !== false}
                onChange={(e) => updateTmpl('showAddress', e.target.checked)}
                className="accent-primary rounded cursor-pointer"
              />
              <span className="font-label-sm text-label-sm">Show Address</span>
            </label>
          </div>
        </div>
      </div>

      {/* 2. Custom Table Column Headers */}
      <div className="pb-pad-sm border-b border-outline-variant/20 space-y-3">
        <span className="font-label-sm text-label-sm font-semibold text-on-surface uppercase tracking-wide">
          2. Table Column Names & Line Items
        </span>
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-label-sm text-[11px] text-on-surface-variant mb-1">
                Item Header Name
              </label>
              <input
                type="text"
                value={template.itemLabel || ''}
                onChange={(e) => updateTmpl('itemLabel', e.target.value)}
                placeholder="Item Description"
                className="w-full p-2 px-2.5 bg-surface-container-lowest border border-outline-variant/60 rounded-DEFAULT text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs"
              />
            </div>
            <div>
              <label className="block font-label-sm text-[11px] text-on-surface-variant mb-1">
                Quantity Header Name
              </label>
              <input
                type="text"
                value={template.qtyLabel || ''}
                onChange={(e) => updateTmpl('qtyLabel', e.target.value)}
                placeholder="Qty"
                className="w-full p-2 px-2.5 bg-surface-container-lowest border border-outline-variant/60 rounded-DEFAULT text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs"
              />
            </div>
            <div>
              <label className="block font-label-sm text-[11px] text-on-surface-variant mb-1">
                Rate / Price Header Name
              </label>
              <input
                type="text"
                value={template.rateLabel || ''}
                onChange={(e) => updateTmpl('rateLabel', e.target.value)}
                placeholder="Rate (₹)"
                className="w-full p-2 px-2.5 bg-surface-container-lowest border border-outline-variant/60 rounded-DEFAULT text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs"
              />
            </div>
            <div>
              <label className="block font-label-sm text-[11px] text-on-surface-variant mb-1">
                Total Header Name
              </label>
              <input
                type="text"
                value={template.totalLabel || ''}
                onChange={(e) => updateTmpl('totalLabel', e.target.value)}
                placeholder="Total (₹)"
                className="w-full p-2 px-2.5 bg-surface-container-lowest border border-outline-variant/60 rounded-DEFAULT text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs"
              />
            </div>
          </div>

          <div className="pt-1 grid grid-cols-2 sm:grid-cols-4 gap-3 text-body-sm">
            <label className="flex items-center gap-2 cursor-pointer text-on-surface select-none">
              <input
                type="checkbox"
                checked={Boolean(template.showCategory)}
                onChange={(e) => updateTmpl('showCategory', e.target.checked)}
                className="accent-primary rounded cursor-pointer"
              />
              <span className="font-label-sm text-label-sm">Show Category</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-on-surface select-none">
              <input
                type="checkbox"
                checked={Boolean(template.showHsn)}
                onChange={(e) => updateTmpl('showHsn', e.target.checked)}
                className="accent-primary rounded cursor-pointer"
              />
              <span className="font-label-sm text-label-sm">Show HSN/SAC</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-on-surface select-none">
              <input
                type="checkbox"
                checked={template.showDiscount !== false}
                onChange={(e) => updateTmpl('showDiscount', e.target.checked)}
                className="accent-primary rounded cursor-pointer"
              />
              <span className="font-label-sm text-label-sm">Show Discount</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-on-surface select-none">
              <input
                type="checkbox"
                checked={template.showTaxBreakdown !== false}
                onChange={(e) => updateTmpl('showTaxBreakdown', e.target.checked)}
                className="accent-primary rounded cursor-pointer"
              />
              <span className="font-label-sm text-label-sm">Tax Breakdown</span>
            </label>
          </div>
        </div>
      </div>

      {/* 3. Terms, Disclaimers & Footer Notice */}
      <div className="space-y-3">
        <span className="font-label-sm text-label-sm font-semibold text-on-surface uppercase tracking-wide">
          3. Terms & Conditions & Document Disclaimers
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-pad-md">
          {/* Terms & Conditions */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-label-sm text-label-sm text-on-surface-variant">
                Terms & Conditions
              </label>
              <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-on-surface font-medium select-none">
                <input
                  type="checkbox"
                  checked={template.showTerms !== false}
                  onChange={(e) => updateTmpl('showTerms', e.target.checked)}
                  className="accent-primary rounded cursor-pointer"
                />
                <span>Include on Bill</span>
              </label>
            </div>
            <textarea
              rows={3}
              value={template.termsText || ''}
              onChange={(e) => updateTmpl('termsText', e.target.value)}
              placeholder="1. Goods once sold can be exchanged within 7 days with original invoice.&#10;2. Warranty / guarantee as per manufacturer policy."
              className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-DEFAULT p-2.5 text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs resize-none font-sans leading-relaxed"
            />
          </div>

          {/* Footer Notice & Additional Settings */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant">
                  Footer Greeting Notice
                </label>
                <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-on-surface font-medium select-none">
                  <input
                    type="checkbox"
                    checked={template.showFooterNotice !== false}
                    onChange={(e) => updateTmpl('showFooterNotice', e.target.checked)}
                    className="accent-primary rounded cursor-pointer"
                  />
                  <span>Show Greeting</span>
                </label>
              </div>
              <input
                type="text"
                value={template.footerNotice || ''}
                onChange={(e) => updateTmpl('footerNotice', e.target.value)}
                placeholder="Thank you for shopping with us!"
                className="w-full p-2 px-3 bg-surface-container-lowest border border-outline-variant/60 rounded-DEFAULT text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs"
              />
            </div>

            <div className="pt-1 flex flex-wrap items-center gap-4 text-body-sm">
              <label className="flex items-center gap-2 cursor-pointer text-on-surface select-none">
                <input
                  type="checkbox"
                  checked={template.showAmountInWords !== false}
                  onChange={(e) => updateTmpl('showAmountInWords', e.target.checked)}
                  className="accent-primary rounded cursor-pointer"
                />
                <span className="font-label-sm text-label-sm">Show Amount in Words</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-on-surface select-none">
                <input
                  type="checkbox"
                  checked={template.showQrCode !== false}
                  onChange={(e) => updateTmpl('showQrCode', e.target.checked)}
                  className="accent-primary rounded cursor-pointer"
                />
                <span className="font-label-sm text-label-sm">Show UPI / Dynamic QR Code</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Full-Scale Zero-Scrubbing Preview Modal */}
      <ThermalReceiptModal
        invoice={sampleInvoice}
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        templateOverride={template}
      />
    </div>
  )
}
