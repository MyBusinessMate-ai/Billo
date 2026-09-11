import React from 'react'
import { QRCodeSVG } from 'qrcode.react'

interface DynamicQRFormProps {
  values: {
    qrPurpose?: string
    qrPayloadUrl?: string
    showDynamicQrOnBill?: boolean
    dynamicQrHeader?: string
    upiId?: string
    instagram?: string
    website?: string
    googleReview?: string
  }
  onChange: (field: string, val: any) => void
}

export const DynamicQRForm: React.FC<DynamicQRFormProps> = ({ values, onChange }) => {
  const selectedPurpose =
    values.qrPurpose === 'website' || values.qrPurpose === 'review' || values.qrPurpose === 'custom'
      ? values.qrPurpose
      : 'instagram'

  const showOnBill = values.showDynamicQrOnBill !== false
  const dynamicHeader = values.dynamicQrHeader || 'Rate us on Google & Review'

  const getUrlForPurpose = (purpose: string) => {
    if (purpose === 'instagram') {
      const raw = values.instagram?.trim() || ''
      if (!raw) return 'https://instagram.com'
      if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
      return `https://instagram.com/${raw.replace(/^@/, '')}`
    }
    if (purpose === 'website') {
      const raw = values.website?.trim() || ''
      if (!raw) return 'https://example.com'
      if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
      return `https://${raw}`
    }
    if (purpose === 'review') {
      const raw = values.googleReview?.trim() || ''
      if (!raw) return 'https://google.com'
      if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
      return `https://${raw}`
    }
    if (purpose === 'custom') {
      const raw = values.qrPayloadUrl?.trim() || ''
      if (!raw) return 'https://example.com'
      return raw
    }
    return 'https://example.com'
  }

  const handlePurposeChange = (newPurpose: string) => {
    onChange('qrPurpose', newPurpose)
    const targetUrl = getUrlForPurpose(newPurpose)
    onChange('qrPayloadUrl', targetUrl)
  }

  const qrPayload = getUrlForPurpose(selectedPurpose)

  return (
    <div className="bg-surface-container-lowest rounded-DEFAULT border border-outline-variant/40 p-pad-lg shadow-sm">
      <div className="flex items-center justify-between pb-pad-sm mb-pad-md border-b border-outline-variant/30">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-on-surface text-[20px]">
            qr_code_scanner
          </span>
          <div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">
              Dynamic Bill QR Configuration
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant text-[11px] mt-0.5">
              Configure marketing, social, and Google review QR codes embedded into printed
              receipts.
            </p>
          </div>
        </div>
        <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
          STEP 04
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-pad-lg items-start">
        {/* Left Column: Form Controls */}
        <div className="space-y-4">
          {/* Bill Printing Toggle */}
          <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-DEFAULT border border-outline-variant/40">
            <div>
              <span className="block font-label-sm text-label-sm text-on-surface font-semibold">
                Show Marketing / Review QR on Bills
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant text-[11px]">
                Prints this dynamic QR footer at the bottom of thermal/A4 invoices.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={showOnBill}
                onChange={(e) => onChange('showDynamicQrOnBill', e.target.checked)}
              />
              <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-outline-variant/30 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div>
            <label
              className="p-1 block font-label-sm text-label-sm text-on-surface font-semibold mb-1"
              htmlFor="qr-purpose"
            >
              QR Code Destination Channel
            </label>
            <select
              className="p-2 w-full h-button-md bg-surface-container-lowest border border-outline-variant/60 rounded-DEFAULT px-pad-sm font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer shadow-2xs"
              id="qr-purpose"
              value={selectedPurpose}
              onChange={(e) => handlePurposeChange(e.target.value)}
            >
              <option value="review">Google Review Link</option>
              <option value="instagram">Instagram Profile Link</option>
              <option value="website">Store Website Link</option>
              <option value="custom">Custom Web URL / UID Payload</option>
            </select>
            <p className="font-body-sm text-body-sm text-on-surface-variant text-[11px] mt-1">
              Automatically links to the corresponding social URL or review link.
            </p>
          </div>

          {/* Tagline / Notice on Bill */}
          <div>
            <label
              className="p-1 block font-label-sm text-label-sm text-on-surface font-semibold mb-1"
              htmlFor="qr-header-notice"
            >
              QR Header / Call to Action Text
            </label>
            <input
              id="qr-header-notice"
              type="text"
              className="p-2 w-full h-button-md bg-surface-container-lowest border border-outline-variant/60 rounded-DEFAULT px-pad-sm font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs"
              value={dynamicHeader}
              placeholder="e.g. Rate us on Google & Review"
              onChange={(e) => onChange('dynamicQrHeader', e.target.value)}
            />
            <p className="font-body-sm text-body-sm text-on-surface-variant text-[11px] mt-1">
              Title printed directly above the QR code on customer slips.
            </p>
          </div>

          {/* Custom URL Field if Custom is selected */}
          {selectedPurpose === 'custom' && (
            <div>
              <label
                className="p-1 block font-label-sm text-label-sm text-on-surface font-semibold mb-1"
                htmlFor="qr-payload-custom"
              >
                Custom Payload / Destination URL
              </label>
              <input
                id="qr-payload-custom"
                type="text"
                className="p-2 w-full h-button-md bg-surface-container-lowest border border-outline-variant/60 rounded-DEFAULT px-pad-sm font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs font-mono text-xs"
                value={values.qrPayloadUrl || ''}
                placeholder="https://..."
                onChange={(e) => onChange('qrPayloadUrl', e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Right Column: Scannable QR Preview Box */}
        <div className="flex flex-col items-center justify-center p-pad-lg bg-surface-container-low rounded-DEFAULT border border-outline-variant/30 text-center">
          <div className="p-4 bg-white rounded-DEFAULT border border-outline-variant/40 shadow-xs flex items-center justify-center">
            <QRCodeSVG value={qrPayload} size={130} level="M" includeMargin={false} />
          </div>
          <p className="mt-3 font-label-sm text-xs font-semibold text-on-surface">
            {dynamicHeader}
          </p>
        </div>
      </div>
    </div>
  )
}
