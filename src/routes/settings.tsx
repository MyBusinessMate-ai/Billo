import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { ThemeColorsForm } from '../components/settings/ThemeColorsForm'
import { StoreIdentityForm } from '../components/settings/StoreIdentityForm'
import { BillTemplateCustomizer } from '../components/settings/BillTemplateCustomizer'
import { SocialLinksForm } from '../components/settings/SocialLinksForm'
import { DynamicQRForm } from '../components/settings/DynamicQRForm'
import { AuthSettingsForm } from '../components/settings/AuthSettingsForm'
import { usePOS } from '../context/POSContext'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { settings, updateSettings, showToast } = usePOS()
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isUserDirtyRef = useRef(false)

  // Local draft state for live typing synchronization
  const [draft, setDraft] = useState({
    businessName: settings.businessName,
    storeName: settings.storeName,
    gstin: settings.gstin,
    phone: settings.phone,
    email: settings.email || settings.supportEmail || '',
    registeredAddress: settings.registeredAddress,
    logoUrl: settings.logoUrl,
    logoName: settings.logoName,
    taxRatePercent: settings.taxRatePercent ?? 5,
    instagram: settings.instagram,
    website: settings.website,
    whatsapp: settings.whatsapp,
    googleReview: settings.googleReview,
    qrPurpose: settings.qrPurpose,
    qrPayloadUrl: settings.qrPayloadUrl,
    showDynamicQrOnBill: settings.showDynamicQrOnBill ?? true,
    dynamicQrHeader: settings.dynamicQrHeader || 'Rate us on Google & Review',
    upiId: settings.upiId || '',
    invoiceFormat: settings.invoiceFormat || 'thermal',
    billTemplate: settings.billTemplate,
    primaryColor: settings.primaryColor || '#000000',
    secondaryColor: settings.secondaryColor || '#006a63',
    buttonHoverColor: settings.buttonHoverColor || '#1f2937',
    themeMode: settings.themeMode || 'light',
    backgroundColor: settings.backgroundColor || '#f8f9ff',
    textColor: settings.textColor || '#0b1c30',
  })

  const draftRef = useRef(draft)
  draftRef.current = draft

  // Keep draft in sync if settings update externally, ONLY if user is not actively editing
  useEffect(() => {
    if (!isUserDirtyRef.current) {
      const synced = {
        businessName: settings.businessName,
        storeName: settings.storeName,
        gstin: settings.gstin,
        phone: settings.phone,
        email: settings.email || settings.supportEmail || '',
        registeredAddress: settings.registeredAddress,
        logoUrl: settings.logoUrl,
        logoName: settings.logoName,
        taxRatePercent: settings.taxRatePercent ?? 5,
        instagram: settings.instagram,
        website: settings.website,
        whatsapp: settings.whatsapp,
        googleReview: settings.googleReview,
        qrPurpose: settings.qrPurpose,
        qrPayloadUrl: settings.qrPayloadUrl,
        showDynamicQrOnBill: settings.showDynamicQrOnBill ?? true,
        dynamicQrHeader: settings.dynamicQrHeader || 'Rate us on Google & Review',
        upiId: settings.upiId || '',
        invoiceFormat: settings.invoiceFormat || 'thermal',
        billTemplate: settings.billTemplate,
        primaryColor: settings.primaryColor || '#000000',
        secondaryColor: settings.secondaryColor || '#006a63',
        buttonHoverColor: settings.buttonHoverColor || '#1f2937',
        themeMode: settings.themeMode || 'light',
        backgroundColor: settings.backgroundColor || '#f8f9ff',
        textColor: settings.textColor || '#0b1c30',
      }
      draftRef.current = synced
      setDraft(synced)
    }
  }, [settings])

  // Clear timer on component unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [])

  // Triggered when the user modifies any field
  const handleFieldChange = (field: string, val: any) => {
    isUserDirtyRef.current = true
    const nextDraft = { ...draftRef.current, [field]: val }
    draftRef.current = nextDraft
    setDraft(nextDraft)

    // Clear any active timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    // Theme color fields are saved atomically upon confirmation in ThemeColorsForm
    const isThemeField =
      field === 'primaryColor' ||
      field === 'secondaryColor' ||
      field === 'buttonHoverColor' ||
      field === 'backgroundColor' ||
      field === 'textColor' ||
      field === 'themeMode'

    if (isThemeField) {
      return
    }

    // Save logo removals, additions, format changes, and QR switches immediately
    if (
      field === 'logoUrl' ||
      field === 'logoName' ||
      field === 'invoiceFormat' ||
      field === 'showDynamicQrOnBill' ||
      field === 'qrPurpose'
    ) {
      const payloadToSave = draftRef.current
      isUserDirtyRef.current = false
      updateSettings(payloadToSave)
      showToast('Changes saved', 'success')
      return
    }

    // Debounce text inputs
    saveTimerRef.current = setTimeout(async () => {
      const payloadToSave = draftRef.current
      isUserDirtyRef.current = false
      await updateSettings(payloadToSave)
      showToast('Changes saved', 'success')
    }, 800)
  }

  return (
    <AppLayout>
      <div className="w-full max-w-5xl space-y-pad-lg">
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-pad-md pb-pad-lg border-b border-outline-variant/30">
          <div>
            <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight">
              Receipt Layout & Store Identity
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              Configure billing credentials, digital slip routing, and store security.
            </p>
          </div>
        </div>

        {/* Configuration Forms */}
        <div className="space-y-pad-lg">
          {/* 0. Brand Theme & Colors */}
          <ThemeColorsForm
            values={{
              primaryColor: draft.primaryColor,
              secondaryColor: draft.secondaryColor,
              buttonHoverColor: draft.buttonHoverColor,
              themeMode: draft.themeMode as 'light' | 'dark',
              backgroundColor: draft.backgroundColor,
              textColor: draft.textColor,
            }}
            onChange={handleFieldChange}
          />

          {/* 1. Store Identity & Billing Information */}
          <StoreIdentityForm
            values={{
              businessName: draft.businessName,
              storeName: draft.storeName,
              gstin: draft.gstin,
              phone: draft.phone,
              email: draft.email,
              registeredAddress: draft.registeredAddress,
              logoUrl: draft.logoUrl,
              logoName: draft.logoName,
              taxRatePercent: draft.taxRatePercent,
              invoiceFormat: (draft.invoiceFormat as 'thermal' | 'a4') || 'thermal',
            }}
            onChange={handleFieldChange}
          />

          {/* 2. Visual Bill & Receipt Template Customizer (Thermal & A4) */}
          <BillTemplateCustomizer
            settings={{
              ...settings,
              ...draft,
              billTemplate: draft.billTemplate || settings.billTemplate,
            }}
            onChange={handleFieldChange}
          />

          {/* 3. Receipt Social Links */}
          <SocialLinksForm
            values={{
              instagram: draft.instagram,
              website: draft.website,
              whatsapp: draft.whatsapp,
              googleReview: draft.googleReview,
            }}
            onChange={handleFieldChange}
          />

          {/* 4. Dynamic Bill QR Configuration */}
          <DynamicQRForm
            values={{
              qrPurpose: draft.qrPurpose,
              qrPayloadUrl: draft.qrPayloadUrl,
              showDynamicQrOnBill: draft.showDynamicQrOnBill,
              dynamicQrHeader: draft.dynamicQrHeader,
              upiId: draft.upiId,
              instagram: draft.instagram,
              website: draft.website,
              googleReview: draft.googleReview,
            }}
            onChange={handleFieldChange}
          />

          {/* 4. Admin Authentication & Security Credentials */}
          <AuthSettingsForm />
        </div>
      </div>
    </AppLayout>
  )
}
