import { z } from 'zod'

export interface FirestoreTimestamp {
  seconds: number
  nanoseconds: number
  toDate?: () => Date
  toMillis?: () => number
}

export const FirestoreTimestampSchema = z.custom<FirestoreTimestamp>(
  (val) => {
    if (!val || typeof val !== 'object') return false
    const obj = val as Record<string, unknown>
    return typeof obj.seconds === 'number' && typeof obj.nanoseconds === 'number'
  },
  {
    message: 'Expected Firestore Timestamp object with seconds and nanoseconds',
  }
)

export const CustomerIdSchema = z
  .string()
  .regex(
    /^CUS-\d{4}-\d{6}$/,
    "Customer ID must follow 'CUS-{YEAR}-{6 DIGIT}' (e.g. CUS-2026-000001)"
  )

export const CustomerSchema = z.object({
  customerId: CustomerIdSchema,
  name: z.string().min(1, 'Customer name is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phoneNo: z.string().min(1, 'Phone number is required'),
  gstin: z.string().optional(),
  visits: z.number().int().nonnegative().default(0),
  lastVisitAt: FirestoreTimestampSchema.optional(),
  createdAt: FirestoreTimestampSchema,
  updatedAt: FirestoreTimestampSchema,
})

export type Customer = z.infer<typeof CustomerSchema>

export const CategoryIdSchema = z
  .string()
  .regex(/^CAT-\d{6}$/, "Category ID must follow 'CAT-{6 DIGIT}' (e.g. CAT-000001)")

export const CategoryDefaultFieldSettingSchema = z.object({
  enabled: z.boolean().default(true),
  required: z.boolean().default(false),
  defaultValue: z.any().optional(),
  label: z.string().optional(),
})
export type CategoryDefaultFieldSetting = z.infer<typeof CategoryDefaultFieldSettingSchema>

export const CategoryDefaultFieldsConfigSchema = z.object({
  productItem: CategoryDefaultFieldSettingSchema.default({ enabled: true, required: true }),
  productDescription: CategoryDefaultFieldSettingSchema.default({ enabled: true, required: false }),
  price: CategoryDefaultFieldSettingSchema.default({ enabled: true, required: true }),
  gst: CategoryDefaultFieldSettingSchema.default({
    enabled: true,
    required: false,
    defaultValue: 0,
  }),
  itemCount: CategoryDefaultFieldSettingSchema.default({
    enabled: true,
    required: true,
    defaultValue: 1,
  }),
  discount: CategoryDefaultFieldSettingSchema.default({ enabled: true, required: false }),
})
export type CategoryDefaultFieldsConfig = z.infer<typeof CategoryDefaultFieldsConfigSchema>

export const DEFAULT_CATEGORY_FIELDS_CONFIG: CategoryDefaultFieldsConfig = {
  productItem: { enabled: true, required: true, label: 'Product Item' },
  productDescription: { enabled: true, required: false, label: 'Product Description' },
  price: { enabled: true, required: true, label: 'Price (₹)' },
  gst: { enabled: true, required: false, defaultValue: 0, label: 'GST (%)' },
  itemCount: { enabled: true, required: true, defaultValue: 1, label: 'Item Count' },
  discount: { enabled: true, required: false, label: 'Discount' },
}

export const CategoryCustomFieldSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['text', 'number', 'link', 'date', 'select', 'boolean', 'textarea']),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
  placeholder: z.string().optional(),
  defaultValue: z.any().optional(),
  description: z.string().optional(),
  showInBilling: z.boolean().optional().default(true),
  showInReceipt: z.boolean().optional().default(true),
  billColumnPlacement: z.enum(['separate', 'merged', 'hidden']).optional().default('merged'),
  billTargetColumn: z
    .enum(['description', 'price', 'quantity', 'gst', 'discount'])
    .optional()
    .default('description'),
  billColumnHeader: z.string().optional(),
  textCasing: z.enum(['uppercase', 'lowercase', 'normal']).optional().default('normal'),
  order: z.number().optional().default(0),
})
export type CategoryCustomField = z.infer<typeof CategoryCustomFieldSchema>

export const CategorySchema = z.object({
  categoryId: CategoryIdSchema,
  categoryName: z.string().min(1, 'Category name is required'),
  basePrice: z.number().nonnegative('Base price must be non-negative').optional(),
  defaultFieldsConfig: CategoryDefaultFieldsConfigSchema.optional(),
  customFields: z.array(CategoryCustomFieldSchema).optional(),
  createdAt: FirestoreTimestampSchema,
  updatedAt: FirestoreTimestampSchema,
})

export type Category = z.infer<typeof CategorySchema>

export const BillingIdSchema = z
  .string()
  .regex(
    /^INV-\d{4}-\d{6}$/,
    "Billing ID must follow 'INV-{YEAR}-{6 DIGIT}' (e.g. INV-2026-000001)"
  )

export const BillingModeSchema = z.enum(['cash', 'upi', 'card'])
export type BillingMode = z.infer<typeof BillingModeSchema>

export const BillingItemSchema = z.object({
  productId: z.string().optional(),
  categoryId: CategoryIdSchema.or(z.string().min(1, 'Category ID is required')),
  categoryName: z.string().min(1, 'Category name is required'),
  itemName: z.string().optional(),
  description: z.string().optional(),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
  total: z.number().nonnegative('Line total must be non-negative'),
  gstPercent: z.number().nonnegative().optional(),
  hsn: z.string().optional(),
  discountAmount: z.number().nonnegative().optional(),
  discountPercent: z.number().nonnegative().optional(),
  customFields: z.record(z.string(), z.any()).optional(),
  customFieldConfigs: z.array(CategoryCustomFieldSchema).optional(),
})

export type BillingItem = z.infer<typeof BillingItemSchema>

export function getBillingItemDisplayName(item: {
  itemName?: string
  categoryName: string
}): string {
  if (item.itemName && item.itemName.trim().length > 0) {
    return item.itemName.trim()
  }
  return item.categoryName
}

export const BillingSchema = z.object({
  billingId: BillingIdSchema,
  customerId: CustomerIdSchema.optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().optional(),
  customerGstin: z.string().optional(),
  items: z.array(BillingItemSchema).min(1, 'Billing invoice must contain at least one item'),
  subtotal: z.number().optional(),
  taxPercent: z.number().optional(),
  taxAmount: z.number().optional(),
  discountCode: z.string().optional(),
  discountAmount: z.number().optional(),
  total: z.number().nonnegative('Billing total must be non-negative'),
  billMode: BillingModeSchema,
  invoiceFormat: z.enum(['thermal', 'a4']).optional(),
  internalNote: z.string().optional(),
  createdAt: FirestoreTimestampSchema,
  updatedAt: FirestoreTimestampSchema,
})

export type Billing = z.infer<typeof BillingSchema>

export const CustomFieldTypeSchema = z.enum([
  'text',
  'number',
  'link',
  'date',
  'select',
  'boolean',
  'textarea',
])

export const CustomProductFieldSchema = z.object({
  id: z.string().min(1, 'Field ID is required'),
  name: z.string().min(1, 'Field name is required'),
  type: CustomFieldTypeSchema,
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
  placeholder: z.string().optional(),
  defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
  showInBilling: z.boolean().optional(),
  showInReceipt: z.boolean().optional(),
  billColumnPlacement: z.enum(['separate', 'merged', 'hidden']).optional(),
  billTargetColumn: z.enum(['description', 'price', 'quantity', 'gst', 'discount']).optional(),
  billColumnHeader: z.string().optional(),
  textCasing: z.enum(['uppercase', 'lowercase', 'normal']).optional(),
  order: z.number().optional(),
  description: z.string().optional(),
})

export type CustomProductField = z.infer<typeof CustomProductFieldSchema>

export const BillingRulesSchema = z.object({
  enableItemGst: z.boolean().default(false),
  defaultGstPercent: z.number().nonnegative().default(0),
  requireGstin: z.boolean().optional(),
  enableItemDiscount: z.boolean().default(true),
  enableInvoiceDiscount: z.boolean().default(true),
  maxDiscountPercent: z.number().nonnegative().optional(),
  enableCustomFieldsInBilling: z.boolean().optional(),
})

export type BillingRules = z.infer<typeof BillingRulesSchema>

export const ProductIdSchema = z
  .string()
  .regex(/^PROD-\d{6}$/, "Product ID must follow 'PROD-{6 DIGIT}' (e.g. PROD-000001)")

export const ProductSchema = z.object({
  productId: ProductIdSchema,
  categoryId: CategoryIdSchema.or(z.string().min(1, 'Category ID is required')),
  categoryName: z.string().min(1, 'Category name is required'),
  productName: z.string().min(1, 'Product name is required'),
  price: z.number().nonnegative('Price must be non-negative'),
  quantity: z.number().int().nonnegative('Available quantity must be non-negative'),
  lowStockThreshold: z.number().int().nonnegative().default(10),
  isActive: z.boolean().default(true),
  customFields: z.record(z.string(), z.any()).optional(),
  createdAt: FirestoreTimestampSchema,
  updatedAt: FirestoreTimestampSchema,
})

export type Product = z.infer<typeof ProductSchema>

export function isProductLowStock(product: {
  quantity: number
  lowStockThreshold: number
}): boolean {
  return product.quantity <= product.lowStockThreshold
}

export const SocialsSchema = z.object({
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  website: z.string().optional(),
  gbp: z.string().optional(),
  googleReviews: z.string().optional(),
  whatsappBusinessSupport: z.string().optional(),
})

export type Socials = z.infer<typeof SocialsSchema>

export const QrSettingsSchema = z.object({
  googleCustomerReviewUrl: z.string().optional(),
  upiUrl: z.string().optional(),
  qrPurpose: z.string().optional(),
  showDynamicQrOnBill: z.boolean().optional(),
  dynamicQrHeader: z.string().optional(),
  upiId: z.string().optional(),
})

export type QrSettings = z.infer<typeof QrSettingsSchema>

export const BillTemplateSchema = z.object({
  invoiceTitle: z.string().optional(),
  invoiceSubtitle: z.string().optional(),
  showLogo: z.boolean().optional(),
  showAddress: z.boolean().optional(),
  showPhone: z.boolean().optional(),
  showEmail: z.boolean().optional(),
  showGstin: z.boolean().optional(),
  showCustomerPhone: z.boolean().optional(),
  showCustomerEmail: z.boolean().optional(),
  showCategory: z.boolean().optional(),
  showHsn: z.boolean().optional(),
  showDiscount: z.boolean().optional(),
  showTaxBreakdown: z.boolean().optional(),
  showAmountInWords: z.boolean().optional(),
  showShipTo: z.boolean().optional(),
  showRemarks: z.boolean().optional(),
  showQrCode: z.boolean().optional(),
  showTerms: z.boolean().optional(),
  termsText: z.string().optional(),
  showCustomerSignature: z.boolean().optional(),
  showAuthorizedSignatory: z.boolean().optional(),
  signatoryText: z.string().optional(),
  showFooterNotice: z.boolean().optional(),
  footerNotice: z.string().optional(),
  itemLabel: z.string().optional(),
  qtyLabel: z.string().optional(),
  rateLabel: z.string().optional(),
  totalLabel: z.string().optional(),
})

export type BillTemplate = z.infer<typeof BillTemplateSchema>

export const SettingsSchema = z.object({
  storeName: z.string().min(1, 'Store name is required'),
  logoUrl: z.string().optional(),
  taxId: z.string().optional(),
  phoneNumber: z.string().optional(),
  email: z.string().optional(),
  standardGstPercentage: z.number().nonnegative().optional(),
  address: z.string().optional(),
  socials: SocialsSchema.optional(),
  qr: QrSettingsSchema.optional(),
  invoiceFormat: z.enum(['thermal', 'a4']).optional(),
  billTemplate: BillTemplateSchema.optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  buttonHoverColor: z.string().optional(),
  themeMode: z.enum(['light', 'dark']).optional(),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  productFields: z.array(CustomProductFieldSchema).optional(),
  billingRules: BillingRulesSchema.optional(),
  createdAt: FirestoreTimestampSchema,
  updatedAt: FirestoreTimestampSchema,
})

export type Settings = z.infer<typeof SettingsSchema>

export const ThemeDocSchema = z.object({
  themeMode: z.enum(['light', 'dark']).default('light'),
  primaryColor: z.string().default('#000000'),
  secondaryColor: z.string().default('#006a63'),
  buttonHoverColor: z.string().default('#1f2937'),
  backgroundColor: z.string().default('#f8f9ff'),
  textColor: z.string().default('#0b1c30'),
  createdAt: FirestoreTimestampSchema.optional(),
  updatedAt: FirestoreTimestampSchema.optional(),
})

export type ThemeDoc = z.infer<typeof ThemeDocSchema>

export const LibraryAssetSchema = z.object({
  assetId: z.string().min(1, 'Asset ID is required'),
  name: z.string().min(1, 'Asset name is required'),
  url: z.string().url('Asset URL must be a valid URL'),
  publicId: z.string().optional(),
  type: z.string().min(1, 'File type / MIME is required'),
  size: z.number().nonnegative('File size must be non-negative').optional(),
  createdAt: FirestoreTimestampSchema,
  updatedAt: FirestoreTimestampSchema,
})

export type LibraryAsset = z.infer<typeof LibraryAssetSchema>

export const CounterSchema = z.object({
  counterId: z.string().min(1, 'Counter ID is required'),
  lastValue: z.number().int().nonnegative().default(0),
  updatedAt: FirestoreTimestampSchema,
})

export type Counter = z.infer<typeof CounterSchema>
