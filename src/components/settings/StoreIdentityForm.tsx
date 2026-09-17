import React, { useState, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { usePOS } from '../../context/POSContext'

interface StoreIdentityFormProps {
  values: {
    businessName: string
    storeName: string
    gstin: string
    phone: string
    email?: string
    registeredAddress: string
    logoUrl: string
    logoName: string
    taxRatePercent: number
    invoiceFormat?: 'thermal' | 'a4'
  }
  onChange: (field: string, val: string | number) => void
}

export const StoreIdentityForm: React.FC<StoreIdentityFormProps> = ({ values, onChange }) => {
  const navigate = useNavigate()
  const { uploadAssetFile } = usePOS()
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const logoFileInputRef = useRef<HTMLInputElement>(null)

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingLogo(true)
    try {
      const asset = await uploadAssetFile(file, 'store_logos')
      onChange('logoUrl', asset.url)
      onChange('logoName', asset.fileName || file.name)
    } catch (err) {
      console.error('Logo upload failed:', err)
    } finally {
      setIsUploadingLogo(false)
      if (logoFileInputRef.current) {
        logoFileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="bg-surface-container-lowest rounded-DEFAULT border border-outline-variant/40 p-pad-lg shadow-sm">
      <div className="flex items-center justify-between pb-pad-sm mb-pad-md border-b border-outline-variant/30">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-on-surface text-[20px]">store</span>
          <h2 className="font-headline-sm text-headline-sm text-on-surface">
            Store Identity & Billing Information
          </h2>
        </div>
        <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
          STEP 01
        </span>
      </div>

      {/* Store Logo Selector */}
      <div className="mb-pad-md">
        <label className="p-2 block font-label-sm text-label-sm text-on-surface font-semibold mb-pad-xs">
          Store Logo
        </label>
        <div className="flex items-center gap-pad-md p-pad-sm bg-surface-container-low rounded-DEFAULT border border-outline-variant/30">
          <div className="w-12 h-12 rounded-DEFAULT bg-surface-container-lowest border border-outline-variant/40 flex items-center justify-center overflow-hidden p-1 shadow-2xs shrink-0">
            {values.logoUrl ? (
              <img alt="Store Logo" className="w-full h-full object-contain" src={values.logoUrl} />
            ) : (
              <span className="material-symbols-outlined text-[24px] text-on-surface-variant/50">
                hide_image
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-label-md text-label-md text-on-surface font-medium truncate">
              {values.logoName ||
                (values.logoUrl ? 'Custom Brand Logo' : 'No Logo Set (Text Only)')}
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant text-[11px]">
              {values.logoUrl
                ? '80mm monochrome optimized for thermal & standard invoice printing.'
                : 'Header and sidebar display clean business name without logo icon.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={logoFileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp, image/svg+xml"
              onChange={handleLogoFileChange}
              className="hidden"
            />
            {values.logoUrl ? (
              <button
                className="h-8 px-3 bg-error-container/25 hover:bg-error-container/50 text-error border border-error/30 rounded-DEFAULT font-label-sm text-label-sm font-medium transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-2xs"
                type="button"
                onClick={() => {
                  onChange('logoUrl', '')
                  onChange('logoName', '')
                }}
                title="Remove logo (display store name only)"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>Remove</span>
              </button>
            ) : null}
            <button
              className="h-8 px-3 bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/60 text-on-surface rounded-DEFAULT font-label-sm text-label-sm font-medium transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-2xs"
              type="button"
              onClick={() => navigate({ to: '/library' })}
            >
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                photo_library
              </span>
              <span>From Library</span>
            </button>
            <button
              className="h-8 px-3 bg-primary text-on-primary hover:bg-on-primary-fixed-variant rounded-DEFAULT font-label-sm text-label-sm font-medium transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-60 shadow-2xs"
              type="button"
              disabled={isUploadingLogo}
              onClick={() => logoFileInputRef.current?.click()}
            >
              {isUploadingLogo ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
                  <span>Upload Logo</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-pad-md">
        <div className="md:col-span-2">
          <label
            className="p-2 block font-label-sm text-label-sm text-on-surface font-medium mb-1"
            htmlFor="store-name-input"
          >
            Store Name (Legal Commercial Header)
          </label>
          <div className="relative">
            <input
              className="p-2 w-full h-button-md bg-surface-container-lowest border border-outline-variant/60 rounded-DEFAULT px-pad-sm font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              id="store-name-input"
              type="text"
              value={values.storeName}
              onChange={(e) => onChange('storeName', e.target.value)}
              placeholder="LedgerPOS Central Plaza Store #104"
            />
          </div>
        </div>

        <div>
          <label
            className="p-2 block font-label-sm text-label-sm text-on-surface font-medium mb-1"
            htmlFor="tax-id-input"
          >
            Legal Entity / Tax ID (GSTIN)
          </label>
          <input
            className="p-2 w-full h-button-md bg-surface-container-lowest border border-outline-variant/60 rounded-DEFAULT px-pad-sm font-mono-numeric-sm text-mono-numeric-sm text-on-surface uppercase focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            id="tax-id-input"
            type="text"
            value={values.gstin === '0' ? '' : (values.gstin ?? '')}
            onChange={(e) => onChange('gstin', e.target.value)}
            placeholder="e.g. 29AAAAA0000A1Z5 (Leave blank if none)"
          />
        </div>

        <div>
          <label
            className="p-2 block font-label-sm text-label-sm text-on-surface font-medium mb-1"
            htmlFor="gst-rate-input"
          >
            Standard GST / Tax Rate (%)
          </label>
          <div className="relative">
            <input
              className="p-2 w-full h-button-md bg-surface-container-lowest border border-outline-variant/60 rounded-DEFAULT px-pad-sm font-mono-numeric-sm text-mono-numeric-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              id="gst-rate-input"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={values.taxRatePercent === 0 ? '' : (values.taxRatePercent ?? '')}
              onChange={(e) => {
                const val = e.target.value
                onChange('taxRatePercent', val === '' ? 0 : parseFloat(val) || 0)
              }}
              placeholder="0 (Leave blank for 0%)"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-on-surface-variant font-mono">
              %
            </span>
          </div>
        </div>

        <div>
          <label
            className="p-2 block font-label-sm text-label-sm text-on-surface font-medium mb-1"
            htmlFor="contact-input"
          >
            Phone Number
          </label>
          <input
            className="p-2 w-full h-button-md bg-surface-container-lowest border border-outline-variant/60 rounded-DEFAULT px-pad-sm font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            id="contact-input"
            type="text"
            value={values.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            placeholder="+91 80 4123 4567"
          />
        </div>

        <div>
          <label
            className="p-2 block font-label-sm text-label-sm text-on-surface font-medium mb-1"
            htmlFor="email-input"
          >
            Email Address
          </label>
          <input
            className="p-2 w-full h-button-md bg-surface-container-lowest border border-outline-variant/60 rounded-DEFAULT px-pad-sm font-body-sm text-body-sm text-on-surface lowercase focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            id="email-input"
            type="email"
            value={values.email || ''}
            onChange={(e) => onChange('email', e.target.value.toLowerCase())}
            placeholder="support@store.com"
          />
        </div>

        <div className="md:col-span-2">
          <label
            className="p-2 block font-label-sm text-label-sm text-on-surface font-medium mb-1"
            htmlFor="address-input"
          >
            Registered Address (Print Layout 2 Lines)
          </label>
          <textarea
            className="p-2 w-full bg-surface-container-lowest border border-outline-variant/60 rounded-DEFAULT p-pad-sm font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
            id="address-input"
            rows={2}
            value={values.registeredAddress}
            onChange={(e) => onChange('registeredAddress', e.target.value)}
            placeholder="Shop 12-14, Ground Floor, Central Plaza Mall, MG Road, Bengaluru, 560001"
          />
        </div>
      </div>
    </div>
  )
}
