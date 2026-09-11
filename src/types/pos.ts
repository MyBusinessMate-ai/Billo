export type PaymentRail = 'UPI' | 'Card' | 'Cash'

export interface Customer {
  id: string
  name: string
  phone: string
  email: string
  visits: number
  totalSpend: number
  lastVisit: string
  preferredRail: PaymentRail
  gstin?: string
  isNew?: boolean
  isInactive?: boolean
  daysInactive?: number
}

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'

export interface Product {
  id: string
  name: string
  sku: string
  ean: string
  category: string
  costPrice: number
  sellingPrice: number
  margin: number
  stock: number
  unit: string
  status: StockStatus
  lastRestocked: string
  imageUrl?: string
}

export interface BillingItem {
  productId: string
  name: string
  category: string
  price: number
  quantity: number
  total: number
  gstPercent?: number
  hsn?: string
}

export type InvoiceStatus = 'completed' | 'refunded' | 'hold'

export interface BillingInvoice {
  id: string // e.g. "#INV-1048"
  numericId: number
  customer: {
    id?: string
    name: string
    phone: string
    email?: string
    isWalkIn?: boolean
  }
  items: BillingItem[]
  subtotal: number
  taxPercent: number
  taxAmount: number
  discountCode?: string
  discountAmount: number
  netTotal: number
  paymentMethod: string // 'UPI / PhonePe' | 'Cash' | 'Visa (.4019)' | 'Mastercard' | 'UPI / GPay' | 'Card' | 'UPI'
  cashTendered?: number
  changeDue?: number
  status: InvoiceStatus
  timestamp: string
  date: string
}

export type AssetCategory =
  'store_logos' | 'product_photos' | 'receipt_marks' | 'promotional_banners'

export interface MediaAsset {
  id: string
  name: string
  fileName: string
  category: AssetCategory
  url: string
  thumbnailUrl: string
  publicId?: string
  size: string
  bytes?: number
  fileType: string
  resolution: string
  uploadDate: string
  uploadedBy: string
  inUse: boolean
  usageDescription?: string
}

export interface BillTemplateConfig {
  invoiceTitle?: string
  invoiceSubtitle?: string
  showLogo?: boolean
  showAddress?: boolean
  showPhone?: boolean
  showGstin?: boolean
  showCustomerPhone?: boolean
  showCustomerEmail?: boolean
  showCategory?: boolean
  showHsn?: boolean
  showDiscount?: boolean
  showTaxBreakdown?: boolean
  showAmountInWords?: boolean
  showShipTo?: boolean
  showRemarks?: boolean
  showQrCode?: boolean
  showTerms?: boolean
  termsText?: string
  showCustomerSignature?: boolean
  showAuthorizedSignatory?: boolean
  signatoryText?: string
  showFooterNotice?: boolean
  footerNotice?: string
  itemLabel?: string
  qtyLabel?: string
  rateLabel?: string
  totalLabel?: string
}

export interface ThemeConfig {
  themeMode: 'light' | 'dark'
  primaryColor: string
  secondaryColor: string
  buttonHoverColor: string
  backgroundColor: string
  textColor: string
}

export interface StoreSettings {
  businessName: string
  storeName: string
  outletCode: string
  gstin: string
  phone: string
  supportEmail: string
  registeredAddress: string
  logoUrl: string
  logoName: string
  instagram: string
  website: string
  whatsapp: string
  googleReview: string
  qrPurpose: string
  qrPayloadUrl: string
  showDynamicQrOnBill?: boolean
  dynamicQrHeader?: string
  upiId?: string
  printDensity: string
  taxRatePercent: number
  versionTag: string
  autoPrintEnabled: boolean
  printerModel: string
  cashDrawerBalance: number
  invoiceFormat?: 'thermal' | 'a4'
  billTemplate?: BillTemplateConfig
  primaryColor?: string
  secondaryColor?: string
  buttonHoverColor?: string
  themeMode?: 'light' | 'dark'
  backgroundColor?: string
  textColor?: string
}
