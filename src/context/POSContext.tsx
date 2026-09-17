import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type {
  Customer,
  Product,
  BillingInvoice,
  MediaAsset,
  StoreSettings,
  AssetCategory,
} from '../types/pos'
import type { Category } from '../types/schema'

import { customerService } from '../lib/server/services/customer.service'
import { productService } from '../lib/server/services/product.service'
import { categoryService } from '../lib/server/services/category.service'
import { billingService } from '../lib/server/services/billing.service'
import { counterService } from '../lib/server/services/counter.service'
import { settingsService, defaultSettings } from '../lib/server/services/settings.service'
import { libraryService } from '../lib/server/services/library.service'
import {
  themeService,
  applyThemeToDOM,
  getStoredThemeConfig,
  type ThemeConfig,
} from '../lib/server/services/theme.service'
import { sanitizePhone, formatDate, formatTime } from '../utils/formatters'
import { db } from '../lib/firebase'
import { env } from '../config/env'

export interface ToastMessage {
  id: string
  message: string
  type: 'success' | 'info' | 'warning' | 'error'
}

interface POSContextType {
  // Business Branding & Settings (Single Source of Truth)
  settings: StoreSettings
  updateSettings: (partial: Partial<StoreSettings>, silent?: boolean) => void
  updateThemeConfig: (theme: Partial<ThemeConfig>, silent?: boolean) => Promise<void>
  setBusinessLogo: (logoUrl: string, logoName: string) => void
  resetSettingsToDefault: () => void

  // Categories (Live from Firestore)
  categories: Category[]
  addCategory: (
    categoryName: string,
    basePrice?: number,
    extraData?: Partial<Category>
  ) => Promise<Category>
  updateCategory: (
    categoryId: string,
    data: Partial<Category>,
    silent?: boolean
  ) => Promise<void>
  copyCategoryFields: (
    sourceCategoryId: string,
    targetCategoryId: string
  ) => Promise<void>
  addBulkCategories: (
    categoryNames: Array<string | { categoryName: string; basePrice?: number }>
  ) => Promise<{ addedCount: number; skippedCount: number }>
  deleteCategory: (categoryId: string) => Promise<void>
  isCategoryDrawerOpen: boolean
  setIsCategoryDrawerOpen: (open: boolean) => void
  openCategoryDrawer: () => void

  // Customers
  customers: Customer[]
  addCustomer: (data: Partial<Customer> & { name: string; phone: string }) => Customer
  findCustomerByPhone: (phoneQuery: string) => Customer | undefined
  findCustomerByQuery: (query: string) => Customer[]
  selectedCustomerForBilling: Customer | null
  setSelectedCustomerForBilling: (cust: Customer | null) => void

  // Products & Inventory
  products: Product[]
  addProduct: (data: Omit<Product, 'id'>) => Product
  updateProductStock: (productId: string, quantitySold: number) => void
  quickRestockProduct: (productId: string, addedQty: number) => void

  // Invoices & Billing
  invoices: BillingInvoice[]
  nextInvoiceSequence: string
  addInvoice: (invoice: Omit<BillingInvoice, 'id' | 'numericId'>) => BillingInvoice
  getInvoiceById: (id: string) => BillingInvoice | undefined
  refundInvoice: (id: string) => void
  deleteInvoice: (id: string) => Promise<void>

  // Assets & Library
  assets: MediaAsset[]
  totalStorageBytes: number
  maxStorageBytes: number
  maxStorageMb: number
  isStorageLimitReached: boolean
  addAsset: (data: Omit<MediaAsset, 'id'>) => MediaAsset
  uploadAssetFile: (file: File, category?: AssetCategory) => Promise<MediaAsset>
  deleteAsset: (id: string) => void
  setAssetAsLogo: (assetId: string) => void

  // Global UI & Timers
  currentTime: string
  currentDate: string
  globalSearchQuery: string
  setGlobalSearchQuery: (q: string) => void
  toasts: ToastMessage[]
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void
  removeToast: (id: string) => void
  isBackendConnected: boolean
}

const POSContext = createContext<POSContextType | null>(null)

export const POSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<StoreSettings>(() => {
    const initialTheme = getStoredThemeConfig()
    return {
      ...defaultSettings,
      ...initialTheme,
    }
  })
  const [categories, setCategories] = useState<Category[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [invoices, setInvoices] = useState<BillingInvoice[]>([])
  const [nextInvoiceSequence, setNextInvoiceSequence] = useState<string>(
    `INV-${new Date().getFullYear()}-000001`
  )
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [selectedCustomerForBilling, setSelectedCustomerForBilling] = useState<Customer | null>(
    null
  )
  const [globalSearchQuery, setGlobalSearchQuery] = useState('')
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(Boolean(db))
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState<boolean>(false)

  const openCategoryDrawer = useCallback(() => {
    setIsCategoryDrawerOpen(true)
  }, [])

  // Live ticking clock
  const [currentTime, setCurrentTime] = useState('')
  const [currentDate, setCurrentDate] = useState('')

  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      const d = formatDate(now)
      const t = formatTime(now)
      setCurrentDate(d)
      setCurrentTime(`${d} ${t}`)
    }

    updateClock()
    const interval = setInterval(updateClock, 1000)
    return () => clearInterval(interval)
  }, [])

  // Apply theme on initial render and on settings change
  useEffect(() => {
    const isDark = settings.themeMode === 'dark'
    const currentTheme: ThemeConfig = {
      themeMode: settings.themeMode || 'light',
      primaryColor: settings.primaryColor || (isDark ? '#38BDF8' : '#0891B2'),
      secondaryColor: settings.secondaryColor || (isDark ? '#17262D' : '#E2F3F6'),
      buttonHoverColor: settings.buttonHoverColor || (isDark ? '#0EA5E9' : '#0E7490'),
      backgroundColor: settings.backgroundColor || (isDark ? '#091013' : '#F5F8FA'),
      textColor: settings.textColor || (isDark ? '#EFFAFF' : '#132027'),
    }
    applyThemeToDOM(currentTheme)
  }, [
    settings.themeMode,
    settings.primaryColor,
    settings.secondaryColor,
    settings.buttonHoverColor,
    settings.backgroundColor,
    settings.textColor,
  ])

  // Subscribe to real-time database updates from Repositories / Services
  useEffect(() => {
    if (!db) {
      setIsBackendConnected(false)
      return
    }

    setIsBackendConnected(true)

    const unsubSettings = settingsService.subscribe((liveSettings) => {
      if (liveSettings) {
        setSettings((prev) => ({
          ...prev,
          ...liveSettings,
        }))
      }
    })

    const unsubTheme = themeService.subscribe((liveTheme) => {
      if (liveTheme) {
        setSettings((prev) => ({
          ...prev,
          ...liveTheme,
        }))
      }
    })

    const unsubCategories = categoryService.subscribe((liveCategories) => {
      setCategories(liveCategories || [])
    })

    const unsubProducts = productService.subscribe((liveProducts) => {
      setProducts(liveProducts)
    })

    const unsubCustomers = customerService.subscribe((liveCustomers) => {
      setCustomers(liveCustomers)
    })

    const unsubBillings = billingService.subscribe((liveInvoices) => {
      setInvoices(liveInvoices)
    })

    const unsubBillingCounter = counterService.subscribeBillingSequence((liveSeq) => {
      setNextInvoiceSequence(liveSeq)
    })

    const unsubAssets = libraryService.subscribe((liveAssets) => {
      setAssets(liveAssets)
    })

    return () => {
      unsubSettings()
      unsubTheme()
      unsubCategories()
      unsubProducts()
      unsubCustomers()
      unsubBillings()
      unsubBillingCounter()
      unsubAssets()
    }
  }, [])

  const showToast = useCallback(
    (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
      setToasts((prev) => {
        // Prevent duplicate toasts if the same message was already dispatched recently
        if (prev.some((t) => t.message === message)) {
          return prev
        }
        const id = 'toast_' + Date.now() + Math.random().toString(36).substring(2, 6)
        setTimeout(() => {
          removeToast(id)
        }, 2400)
        return [...prev, { id, message, type }]
      })
    },
    []
  )

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const updateThemeConfig = useCallback(
    async (theme: Partial<ThemeConfig>, silent: boolean = true) => {
      const nextSettings = { ...settings, ...theme }
      setSettings(nextSettings)
      const isDark = nextSettings.themeMode === 'dark'
      const fullTheme: ThemeConfig = {
        themeMode: nextSettings.themeMode || 'light',
        primaryColor: nextSettings.primaryColor || (isDark ? '#38BDF8' : '#0891B2'),
        secondaryColor: nextSettings.secondaryColor || (isDark ? '#17262D' : '#E2F3F6'),
        buttonHoverColor: nextSettings.buttonHoverColor || (isDark ? '#0EA5E9' : '#0E7490'),
        backgroundColor: nextSettings.backgroundColor || (isDark ? '#091013' : '#F5F8FA'),
        textColor: nextSettings.textColor || (isDark ? '#EFFAFF' : '#132027'),
      }
      applyThemeToDOM(fullTheme)
      await themeService.save(fullTheme)
      await settingsService.updatePartial(theme, settings).catch(() => {})
      if (!silent) {
        showToast('Theme updated', 'success')
      }
    },
    [settings, showToast]
  )

  const updateSettings = async (partial: Partial<StoreSettings>, silent: boolean = true) => {
    const next = { ...settings, ...partial }
    setSettings(next)

    if (
      partial.themeMode !== undefined ||
      partial.primaryColor !== undefined ||
      partial.secondaryColor !== undefined ||
      partial.buttonHoverColor !== undefined ||
      partial.backgroundColor !== undefined ||
      partial.textColor !== undefined
    ) {
      const isDark = next.themeMode === 'dark'
      const fullTheme: ThemeConfig = {
        themeMode: next.themeMode || 'light',
        primaryColor: next.primaryColor || (isDark ? '#38BDF8' : '#0891B2'),
        secondaryColor: next.secondaryColor || (isDark ? '#17262D' : '#E2F3F6'),
        buttonHoverColor: next.buttonHoverColor || (isDark ? '#0EA5E9' : '#0E7490'),
        backgroundColor: next.backgroundColor || (isDark ? '#091013' : '#F5F8FA'),
        textColor: next.textColor || (isDark ? '#EFFAFF' : '#132027'),
      }
      themeService.save(fullTheme).catch(() => {})
    }

    try {
      await settingsService.updatePartial(partial, settings)
      if (!silent) {
        showToast('Store settings updated successfully', 'success')
      }
    } catch (err) {
      console.error('[POSContext] updateSettings error:', err)
      if (!silent) {
        showToast('Firebase database error: Please check your .env configuration', 'error')
      }
    }
  }

  const setBusinessLogo = (logoUrl: string, logoName: string) => {
    updateSettings({ logoUrl, logoName })
    showToast(`Store logo set to ${logoName}`, 'success')
  }

  const resetSettingsToDefault = () => {
    setSettings(defaultSettings)
    settingsService.save(defaultSettings).catch(() => {})
    showToast('Settings reset to default', 'info')
  }

  const addCategory = async (
    categoryName: string,
    basePrice?: number,
    extraData?: Partial<Category>
  ) => {
    try {
      const created = await categoryService.createCategory(categoryName, basePrice, extraData)
      setCategories((prev) => {
        if (
          prev.some(
            (c) =>
              c.categoryId === created.categoryId ||
              c.categoryName.toLowerCase() === created.categoryName.toLowerCase()
          )
        ) {
          return prev
        }
        return [...prev, created].sort((a, b) => a.categoryName.localeCompare(b.categoryName))
      })
      showToast(`Category "${created.categoryName}" added`, 'success')
      return created
    } catch (err) {
      console.error('[POSContext] addCategory error:', err)
      showToast('Failed to add category', 'error')
      throw err
    }
  }

  const updateCategory = async (
    categoryId: string,
    data: Partial<Category>,
    silent?: boolean
  ) => {
    try {
      await categoryService.updateCategory(categoryId, data)
      setCategories((prev) =>
        prev.map((c) => {
          if (c.categoryId === categoryId) {
            return {
              ...c,
              ...data,
              ...(data.categoryName !== undefined ? { categoryName: data.categoryName } : {}),
              ...(data.basePrice !== undefined ? { basePrice: data.basePrice } : {}),
            }
          }
          return c
        })
      )
      if (!silent) {
        showToast('Category updated successfully', 'success')
      }
    } catch (err) {
      console.error('[POSContext] updateCategory error:', err)
      showToast('Failed to update category', 'error')
      throw err
    }
  }

  const copyCategoryFields = async (sourceCategoryId: string, targetCategoryId: string) => {
    try {
      const result = await categoryService.copyCategoryFields(sourceCategoryId, targetCategoryId)
      setCategories((prev) =>
        prev.map((c) => {
          if (c.categoryId === targetCategoryId) {
            return {
              ...c,
              defaultFieldsConfig: result.defaultFieldsConfig,
              customFields: result.customFields,
            }
          }
          return c
        })
      )
      showToast('Fields copied successfully', 'success')
    } catch (err) {
      console.error('[POSContext] copyCategoryFields error:', err)
      showToast('Failed to copy fields', 'error')
      throw err
    }
  }

  const addBulkCategories = async (
    categoryNames: Array<string | { categoryName: string; basePrice?: number }>
  ) => {
    try {
      const res = await categoryService.createBulkCategories(categoryNames)
      if (res.added.length > 0) {
        setCategories((prev) => {
          const map = new Map(prev.map((c) => [c.categoryName.toLowerCase(), c]))
          for (const item of res.added) {
            map.set(item.categoryName.toLowerCase(), item)
          }
          return Array.from(map.values()).sort((a, b) =>
            a.categoryName.localeCompare(b.categoryName)
          )
        })
      }
      showToast(
        `Imported ${res.added.length} categories${
          res.skipped.length > 0 ? ` (${res.skipped.length} duplicates skipped)` : ''
        }`,
        res.added.length > 0 ? 'success' : 'info'
      )
      return { addedCount: res.added.length, skippedCount: res.skipped.length }
    } catch (err) {
      console.error('[POSContext] addBulkCategories error:', err)
      showToast('Failed to import categories', 'error')
      throw err
    }
  }

  const deleteCategory = async (categoryId: string) => {
    try {
      await categoryService.deleteCategory(categoryId)
      setCategories((prev) => prev.filter((c) => c.categoryId !== categoryId))
      showToast('Category removed', 'info')
    } catch (err) {
      console.error('[POSContext] deleteCategory error:', err)
      showToast('Failed to delete category', 'error')
      throw err
    }
  }

  const addCustomer = (data: Partial<Customer> & { name: string; phone: string }) => {
    const timeOnly = currentTime ? currentTime.split(' ')[1] : '12:00:00'
    const cleanPhone = sanitizePhone(data.phone)
    const upperName = data.name.trim().toUpperCase()
    const lowerEmail = data.email
      ? data.email.trim().toLowerCase()
      : `${upperName.toLowerCase().replace(/\s+/g, '.')}@example.com`
    const upperGstin = data.gstin ? data.gstin.trim().toUpperCase() : undefined

    const newCust: Customer = {
      id: `CUS-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
      email: lowerEmail,
      gstin: upperGstin,
      visits: 1,
      totalSpend: 0,
      lastVisit: `${currentDate || '2026-09-08'} ${timeOnly}`,
      preferredRail: 'UPI',
      isNew: true,
      ...data,
      name: upperName,
      phone: cleanPhone || data.phone,
    }

    setCustomers((prev) => [newCust, ...prev])

    // Orchestrate with customerService asynchronously
    customerService
      .registerCustomer({
        name: upperName,
        phone: data.phone,
        email: lowerEmail,
        gstin: upperGstin,
      })
      .then((created) => {
        setCustomers((prev) => prev.map((c) => (c.id === newCust.id ? created : c)))
      })
      .catch((err) => {
        console.warn('[POSContext] Customer sync notice:', err)
      })

    return newCust
  }

  const findCustomerByPhone = (phoneQuery: string): Customer | undefined => {
    if (!phoneQuery || phoneQuery.trim().length < 3) return undefined
    const cleanQuery = sanitizePhone(phoneQuery)
    return customers.find((c) => {
      const cleanCustomerPhone = sanitizePhone(c.phone)
      return cleanCustomerPhone.includes(cleanQuery) || cleanCustomerPhone.endsWith(cleanQuery)
    })
  }

  const findCustomerByQuery = (query: string): Customer[] => {
    if (!query || query.trim().length === 0) return []
    const q = query.trim().toLowerCase()
    const cleanDigits = sanitizePhone(query)
    return customers.filter((c) => {
      const nameMatch = c.name.toLowerCase().includes(q)
      const idMatch = c.id.toLowerCase().includes(q)
      const emailMatch = c.email.toLowerCase().includes(q)
      const phoneDigits = sanitizePhone(c.phone)
      const phoneMatch = cleanDigits.length >= 3 && phoneDigits.includes(cleanDigits)
      return nameMatch || idMatch || emailMatch || phoneMatch
    })
  }

  const addProduct = (data: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      id: `PROD-${Math.floor(100000 + Math.random() * 900000)}`,
      ...data,
    }
    setProducts((prev) => [newProduct, ...prev])
    showToast(`Added product "${newProduct.name}" to inventory`, 'success')

    // Persist via productService
    productService
      .createProduct({
        productName: data.name,
        categoryId: 'CAT-000001',
        categoryName: data.category || 'General',
        price: data.sellingPrice,
        quantity: data.stock,
      })
      .then((created) => {
        setProducts((prev) => prev.map((p) => (p.id === newProduct.id ? created : p)))
      })
      .catch((err) => {
        console.warn('[POSContext] Product sync notice:', err)
      })

    return newProduct
  }

  const updateProductStock = (productId: string, quantitySold: number) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const newStock = Math.max(0, p.stock - quantitySold)
          return {
            ...p,
            stock: newStock,
            status: newStock === 0 ? 'out_of_stock' : newStock < 10 ? 'low_stock' : 'in_stock',
          }
        }
        return p
      })
    )
  }

  const quickRestockProduct = (productId: string, addedQty: number) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const newStock = p.stock + addedQty
          return {
            ...p,
            stock: newStock,
            status: newStock > 10 ? 'in_stock' : 'low_stock',
            lastRestocked: currentDate,
          }
        }
        return p
      })
    )
    productService.restock(productId, addedQty).catch(() => {})
    showToast(`Restocked ${addedQty} units`, 'success')
  }

  const addInvoice = (invoiceData: Omit<BillingInvoice, 'id' | 'numericId'>) => {
    const tempId = `#${nextInvoiceSequence}`
    const numPart = parseInt(nextInvoiceSequence.split('-')[2] || '1', 10)
    const nextNumericId = isNaN(numPart) ? 1 : numPart

    const newInvoice: BillingInvoice = {
      id: tempId,
      numericId: nextNumericId,
      ...invoiceData,
    }

    // Deduct stock for all items optimistically
    invoiceData.items.forEach((item) => {
      updateProductStock(item.productId, item.quantity)
    })

    let assignedCustomerId = invoiceData.customer.id

    // If customer is not walk-in and has phone / name
    if (
      !invoiceData.customer.isWalkIn &&
      invoiceData.customer.name &&
      invoiceData.customer.name.trim() &&
      invoiceData.customer.name.trim().toLowerCase() !== 'walk-in customer' &&
      invoiceData.customer.name.trim().toLowerCase() !== 'walk-in'
    ) {
      const cleanPhone = sanitizePhone(invoiceData.customer.phone || '')
      const existing = customers.find(
        (c) =>
          (assignedCustomerId && c.id === assignedCustomerId) ||
          (cleanPhone.length >= 7 && sanitizePhone(c.phone) === cleanPhone)
      )

      const timeStamp = `${currentDate || '2026-09-08'} ${currentTime ? currentTime.split(' ')[1] : '12:00:00'}`

      const normName = invoiceData.customer.name.trim().toUpperCase()
      const normEmail = invoiceData.customer.email ? invoiceData.customer.email.trim().toLowerCase() : undefined
      const normGstin = invoiceData.customer.gstin ? invoiceData.customer.gstin.trim().toUpperCase() : undefined

      if (existing) {
        assignedCustomerId = existing.id
        setCustomers((prev) =>
          prev.map((c) => {
            if (c.id === existing.id) {
              return {
                ...c,
                name: normName || c.name,
                email: normEmail || c.email,
                gstin: normGstin || c.gstin,
                visits: (c.visits || 0) + 1,
                totalSpend: (c.totalSpend || 0) + invoiceData.netTotal,
                lastVisit: timeStamp,
              }
            }
            return c
          })
        )
      } else {
        const createdCust = addCustomer({
          name: normName,
          phone: invoiceData.customer.phone || '—',
          email: normEmail,
          gstin: normGstin,
          visits: 1,
          totalSpend: invoiceData.netTotal,
          lastVisit: timeStamp,
          preferredRail: invoiceData.paymentMethod.toUpperCase().includes('UPI')
            ? 'UPI'
            : invoiceData.paymentMethod.toUpperCase().includes('CASH')
              ? 'Cash'
              : 'Card',
        })
        assignedCustomerId = createdCust.id
      }
    }

    // Normalize item custom fields based on category configuration
    const normalizedItems = invoiceData.items.map((it) => {
      if (!it.customFields) return it
      const catObj = categories.find(
        (c) => c.categoryName.toLowerCase() === (it.category || '').toLowerCase()
      )
      const cfConfigs = it.customFieldConfigs || catObj?.customFields || []
      const mappedFields: Record<string, any> = {}
      for (const [k, v] of Object.entries(it.customFields)) {
        const cfg = cfConfigs.find((c) => c.id === k)
        if (typeof v === 'string' && cfg?.textCasing === 'uppercase') {
          mappedFields[k] = v.toUpperCase()
        } else if (typeof v === 'string' && cfg?.textCasing === 'lowercase') {
          mappedFields[k] = v.toLowerCase()
        } else {
          mappedFields[k] = v
        }
      }
      return {
        ...it,
        customFields: mappedFields,
      }
    })

    const resolvedCustomer = {
      ...invoiceData.customer,
      name: (invoiceData.customer.name || 'Walk-in Customer').toUpperCase(),
      email: invoiceData.customer.email ? invoiceData.customer.email.toLowerCase() : undefined,
      gstin: invoiceData.customer.gstin ? invoiceData.customer.gstin.toUpperCase() : undefined,
      id: assignedCustomerId,
    }

    const invoiceWithCustomer = {
      ...newInvoice,
      customer: resolvedCustomer,
      items: normalizedItems,
    }

    setInvoices((prev) => [invoiceWithCustomer, ...prev])

    // Find category ID for line items
    const findCatId = (catName: string) => {
      const found = categories.find((c) => c.categoryName.toLowerCase() === catName.toLowerCase())
      return found?.categoryId || 'CAT-000001'
    }

    // Orchestrate with billingService asynchronously in atomic transaction
    billingService
      .createInvoice({
        customerId: assignedCustomerId,
        customerName: resolvedCustomer.name,
        customerPhone: resolvedCustomer.phone,
        customerEmail: resolvedCustomer.email,
        customerGstin: resolvedCustomer.gstin,
        items: normalizedItems.map((it) => ({
          productId: it.productId,
          productName: it.name,
          categoryId: findCatId(it.category || 'General'),
          categoryName: it.category || 'General',
          quantity: it.quantity,
          unitPrice: it.price,
          total: it.total,
        })),
        subtotal: invoiceData.subtotal,
        taxPercent: invoiceData.taxPercent,
        taxAmount: invoiceData.taxAmount,
        discountCode: invoiceData.discountCode,
        discountAmount: invoiceData.discountAmount,
        netTotal: invoiceData.netTotal,
        billMode: invoiceData.paymentMethod.toUpperCase().includes('UPI')
          ? 'upi'
          : invoiceData.paymentMethod.toUpperCase().includes('CARD')
            ? 'card'
            : 'cash',
        internalNote: invoiceData.internalNote,
      })
      .then(({ billingId }) => {
        setInvoices((prev) =>
          prev.map((inv) => (inv.id === tempId ? { ...inv, id: `#${billingId}` } : inv))
        )
      })
      .catch((err) => {
        console.warn('[POSContext] Billing transaction notice:', err)
      })

    return invoiceWithCustomer
  }

  const getInvoiceById = (id: string) => {
    return invoices.find((inv) => inv.id === id || inv.id === `#${id}` || inv.id.endsWith(id))
  }

  const refundInvoice = (id: string) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === id) {
          return { ...inv, status: 'refunded' }
        }
        return inv
      })
    )
    billingService.refundInvoice(id).catch(() => {})
    showToast(`Invoice ${id} marked as refunded`, 'warning')
  }

  const deleteInvoice = async (id: string) => {
    const cleanId = id.startsWith('#') ? id.slice(1) : id
    setInvoices((prev) =>
      prev.filter((inv) => inv.id !== id && inv.id !== `#${cleanId}` && inv.id !== cleanId)
    )
    try {
      await billingService.deleteInvoice(cleanId)
      showToast(`Invoice #${cleanId} deleted successfully`, 'success')
    } catch (err) {
      console.error('[POSContext] Error deleting invoice:', err)
      showToast('Failed to delete invoice', 'error')
    }
  }

  const maxStorageMb = env.storage.maxStorageMb
  const maxStorageBytes = maxStorageMb > 0 ? maxStorageMb * 1024 * 1024 : 0

  // Deduplicate and calculate real total storage usage
  const uniqueAssets = Array.from(new Map(assets.map((a) => [a.id, a])).values())
  const totalStorageBytes = uniqueAssets.reduce((sum, a) => {
    if (a.bytes && typeof a.bytes === 'number') return sum + a.bytes
    const num = parseFloat(a.size || '0') || 0
    if (a.size?.toLowerCase().includes('gb')) return sum + num * 1024 * 1024 * 1024
    if (a.size?.toLowerCase().includes('mb')) return sum + num * 1024 * 1024
    if (a.size?.toLowerCase().includes('kb')) return sum + num * 1024
    return sum + num
  }, 0)

  const isStorageLimitReached = maxStorageBytes > 0 && totalStorageBytes >= maxStorageBytes

  const addAsset = (data: Omit<MediaAsset, 'id'>) => {
    const newAsset: MediaAsset = {
      id: `asset-${Date.now()}`,
      ...data,
    }
    setAssets((prev) => [newAsset, ...prev])
    showToast(`Asset "${newAsset.fileName}" uploaded to library`, 'success')
    return newAsset
  }

  const uploadAssetFile = async (file: File, category: AssetCategory = 'store_logos') => {
    if (maxStorageBytes > 0 && totalStorageBytes + file.size > maxStorageBytes) {
      const errMessage = `Storage quota limit reached (${maxStorageMb} MB). Please delete unused assets to free up space or upgrade your storage plan.`
      showToast(errMessage, 'error')
      throw new Error(errMessage)
    }

    try {
      const created = await libraryService.uploadFile(file, category)
      setAssets((prev) => {
        if (prev.some((a) => a.id === created.id || a.url === created.url)) {
          return prev
        }
        return [created, ...prev]
      })
      showToast(`Asset "${file.name}" uploaded successfully`, 'success')
      return created
    } catch (err: any) {
      console.error('[POSContext] Upload asset error:', err)
      showToast(err?.message || 'Failed to upload asset', 'error')
      throw err
    }
  }

  const deleteAsset = (id: string) => {
    const target = assets.find((a) => a.id === id)
    setAssets((prev) => prev.filter((a) => a.id !== id))
    if (target) {
      libraryService.deleteAsset(id, target.url, target.publicId).catch(() => {})
    }
    showToast('Asset deleted from library', 'info')
  }

  const setAssetAsLogo = (assetId: string) => {
    const asset = assets.find((a) => a.id === assetId)
    if (asset) {
      setAssets((prev) =>
        prev.map((a) => ({
          ...a,
          inUse: a.id === assetId ? true : a.category === 'store_logos' ? false : a.inUse,
        }))
      )
      setBusinessLogo(asset.url, asset.fileName)
    }
  }

  return (
    <POSContext.Provider
      value={{
        settings,
        updateSettings,
        updateThemeConfig,
        setBusinessLogo,
        resetSettingsToDefault,
        categories,
        addCategory,
        updateCategory,
        copyCategoryFields,
        addBulkCategories,
        deleteCategory,
        isCategoryDrawerOpen,
        setIsCategoryDrawerOpen,
        openCategoryDrawer,
        customers,
        addCustomer,
        findCustomerByPhone,
        findCustomerByQuery,
        selectedCustomerForBilling,
        setSelectedCustomerForBilling,
        products,
        addProduct,
        updateProductStock,
        quickRestockProduct,
        invoices,
        nextInvoiceSequence,
        addInvoice,
        getInvoiceById,
        refundInvoice,
        deleteInvoice,
        assets,
        totalStorageBytes,
        maxStorageBytes,
        maxStorageMb,
        isStorageLimitReached,
        addAsset,
        uploadAssetFile,
        deleteAsset,
        setAssetAsLogo,
        currentTime,
        currentDate,
        globalSearchQuery,
        setGlobalSearchQuery,
        toasts,
        showToast,
        removeToast,
        isBackendConnected,
      }}
    >
      {children}
    </POSContext.Provider>
  )
}

export const usePOS = () => {
  const context = useContext(POSContext)
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider')
  }
  return context
}
