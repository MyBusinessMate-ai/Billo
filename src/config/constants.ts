import type { Category } from '../types/schema'

/**
 * Application Constants
 */

export const COLLECTIONS = {
  CUSTOMERS: 'customers',
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  BILLINGS: 'billings',
  SETTINGS: 'settings',
  COUNTERS: 'counters',
  ASSETS: 'assets',
  THEMES: 'themes',
} as const

export const SETTINGS_DOC_ID = 'global_store_settings'
export const THEME_DOC_ID = 'active_theme'

export const COUNTER_DOC_IDS = {
  PRODUCT: 'product',
  CATEGORY: 'category',
  customerYear: (year: number) => `customer_${year}`,
  billingYear: (year: number) => `billing_${year}`,
} as const

export const DEFAULT_PAGE_SIZE = 50

export const DEFAULT_TAX_RATE_PERCENT = 0

export const INITIAL_CATEGORIES: Category[] = []
