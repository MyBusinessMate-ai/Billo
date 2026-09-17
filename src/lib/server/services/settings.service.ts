import {
  fetchSettings,
  saveSettingsDoc,
  subscribeSettings,
} from '../repositories/settings.repository'
import { db } from '../../firebase'
import type { Settings as FirestoreSettings } from '../../../types/schema'
import type { StoreSettings as UIStoreSettings } from '../../../types/pos'

export const defaultBillTemplate = {
  invoiceTitle: 'TAX INVOICE',
  invoiceSubtitle: 'Retail Voucher',
  showLogo: true,
  showAddress: true,
  showPhone: true,
  showEmail: true,
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
  signatoryText: 'For Store Outlet',
  showFooterNotice: true,
  footerNotice: 'Thank you for shopping with us!',
  itemLabel: 'Item Description',
  qtyLabel: 'Qty',
  rateLabel: 'Rate (₹)',
  totalLabel: 'Total (₹)',
}

export const defaultBillingRules = {
  enableItemGst: false,
  defaultGstPercent: 0,
  requireGstin: false,
  enableItemDiscount: true,
  enableInvoiceDiscount: true,
  maxDiscountPercent: 50,
  enableCustomFieldsInBilling: true,
}

export const defaultProductFields = []

export const defaultSettings: UIStoreSettings = {
  businessName:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BUSINESS_NAME) || 'Retail Store',
  storeName:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STORE_NAME) || 'Main Store Outlet',
  outletCode: 'POS-01',
  gstin: '',
  phone: '',
  email: '',
  supportEmail: '',
  registeredAddress: '',
  logoUrl: '',
  logoName: '',
  instagram: '',
  website: '',
  whatsapp: '',
  googleReview: '',
  qrPurpose: 'review',
  qrPayloadUrl: '',
  showDynamicQrOnBill: true,
  dynamicQrHeader: 'Rate us on Google & Review',
  upiId: '',
  printDensity: 'High (203 DPI)',
  taxRatePercent: 0,
  versionTag: 'v2.4.0',
  autoPrintEnabled: true,
  printerModel: 'Standard 80mm ESC/POS (USB/Network)',
  cashDrawerBalance: 0,
  invoiceFormat: 'thermal',
  billTemplate: defaultBillTemplate,
  primaryColor: '#000000',
  secondaryColor: '#006A63',
  buttonHoverColor: '#1F2937',
  themeMode: 'light',
  backgroundColor: '#F8F9FF',
  textColor: '#0B1C30',
  billingRules: defaultBillingRules,
}

export function mapFirestoreSettingsToUI(s: FirestoreSettings | null): UIStoreSettings {
  if (!s) return defaultSettings

  return {
    ...defaultSettings,
    businessName: s.storeName || defaultSettings.businessName,
    storeName: s.storeName || defaultSettings.storeName,
    logoUrl: s.logoUrl || '',
    gstin: s.taxId !== undefined ? (s.taxId === '0' ? '' : s.taxId) : defaultSettings.gstin || '',
    phone: s.phoneNumber !== undefined ? s.phoneNumber : defaultSettings.phone,
    email: s.email !== undefined ? s.email : defaultSettings.email,
    supportEmail: s.email || defaultSettings.supportEmail,
    registeredAddress: s.address !== undefined ? s.address : defaultSettings.registeredAddress,
    taxRatePercent:
      s.standardGstPercentage !== undefined
        ? Number(s.standardGstPercentage)
        : defaultSettings.taxRatePercent,
    instagram: s.socials?.instagram || '',
    website: s.socials?.website || '',
    whatsapp: s.socials?.whatsappBusinessSupport || '',
    googleReview: s.socials?.googleReviews || '',
    qrPurpose: s.qr?.qrPurpose || defaultSettings.qrPurpose,
    qrPayloadUrl: s.qr?.upiUrl || '',
    showDynamicQrOnBill:
      s.qr?.showDynamicQrOnBill !== undefined
        ? s.qr.showDynamicQrOnBill
        : defaultSettings.showDynamicQrOnBill,
    dynamicQrHeader: s.qr?.dynamicQrHeader || defaultSettings.dynamicQrHeader,
    upiId: s.qr?.upiId || '',
    invoiceFormat: s.invoiceFormat || 'thermal',
    billTemplate: {
      ...defaultBillTemplate,
      ...(s.billTemplate || {}),
    },
    primaryColor: s.primaryColor || defaultSettings.primaryColor,
    secondaryColor: s.secondaryColor || defaultSettings.secondaryColor,
    buttonHoverColor: s.buttonHoverColor || defaultSettings.buttonHoverColor,
    themeMode: s.themeMode || defaultSettings.themeMode,
    backgroundColor: s.backgroundColor || defaultSettings.backgroundColor,
    textColor: s.textColor || defaultSettings.textColor,
    billingRules: s.billingRules
      ? { ...defaultBillingRules, ...s.billingRules }
      : defaultBillingRules,
  }
}

export function mapUISettingsToFirestore(ui: UIStoreSettings): FirestoreSettings {
  const nowSeconds = Math.floor(Date.now() / 1000)
  return {
    storeName: ui.storeName || ui.businessName || '',
    logoUrl: ui.logoUrl ?? '',
    taxId: ui.gstin ?? '',
    phoneNumber: ui.phone ?? '',
    email: ui.email ?? ui.supportEmail ?? '',
    standardGstPercentage: ui.taxRatePercent,
    address: ui.registeredAddress ?? '',
    socials: {
      instagram: ui.instagram || '',
      website: ui.website || '',
      whatsappBusinessSupport: ui.whatsapp || '',
      googleReviews: ui.googleReview || '',
    },
    qr: {
      googleCustomerReviewUrl: ui.googleReview || '',
      upiUrl: ui.qrPayloadUrl || '',
      qrPurpose: ui.qrPurpose || 'review',
      showDynamicQrOnBill: ui.showDynamicQrOnBill ?? true,
      dynamicQrHeader: ui.dynamicQrHeader || 'Rate us on Google & Review',
      upiId: ui.upiId || '',
    },
    invoiceFormat: ui.invoiceFormat || 'thermal',
    billTemplate: ui.billTemplate,
    primaryColor: ui.primaryColor,
    secondaryColor: ui.secondaryColor,
    buttonHoverColor: ui.buttonHoverColor,
    themeMode: ui.themeMode,
    backgroundColor: ui.backgroundColor,
    textColor: ui.textColor,
    ...(ui.billingRules ? { billingRules: ui.billingRules } : {}),
    createdAt: { seconds: nowSeconds, nanoseconds: 0 },
    updatedAt: { seconds: nowSeconds, nanoseconds: 0 },
  }
}

export const settingsService = {
  subscribe(onData: (settings: UIStoreSettings) => void, onError?: (err: Error) => void) {
    return subscribeSettings((firestoreSettings) => {
      onData(mapFirestoreSettingsToUI(firestoreSettings))
    }, onError)
  },

  async get(): Promise<UIStoreSettings> {
    const s = await fetchSettings()
    return mapFirestoreSettingsToUI(s)
  },

  async save(settings: UIStoreSettings): Promise<void> {
    if (db) {
      const firestoreDoc = mapUISettingsToFirestore(settings)
      await saveSettingsDoc(firestoreDoc)
    }
  },

  async updatePartial(
    partial: Partial<UIStoreSettings>,
    currentSettings: UIStoreSettings
  ): Promise<UIStoreSettings> {
    const updated = { ...currentSettings, ...partial }
    if (db) {
      await this.save(updated)
    }
    return updated
  },
}
