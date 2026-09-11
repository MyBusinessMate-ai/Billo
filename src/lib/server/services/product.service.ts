import {
  fetchProductById,
  createProductDoc,
  updateProductStockDoc,
  restockProductDoc,
  deleteProductDoc,
  subscribeProducts,
} from '../repositories/product.repository'
import { getNextSequentialId } from '../repositories/counter.repository'
import { db } from '../../firebase'
import { runTransaction } from 'firebase/firestore'
import { formatDate } from '../../../utils/formatters'
import { calculateProfitMargin } from '../../../utils/calculations'
import type { Product as FirestoreProduct } from '../../../types/schema'
import type { Product as UIProduct, StockStatus } from '../../../types/pos'

export function computeStockStatus(quantity: number, threshold: number = 10): StockStatus {
  if (quantity <= 0) return 'out_of_stock'
  if (quantity <= threshold) return 'low_stock'
  return 'in_stock'
}

export function mapFirestoreProductToUI(p: FirestoreProduct): UIProduct {
  return {
    id: p.productId,
    name: p.productName,
    sku: p.productId,
    ean: '',
    category: (p.categoryName || 'Packaged Goods') as UIProduct['category'],
    costPrice: Math.round(p.price * 0.7),
    sellingPrice: p.price,
    margin: calculateProfitMargin(p.price, Math.round(p.price * 0.7)),
    stock: p.quantity,
    unit: 'pcs',
    status: computeStockStatus(p.quantity, p.lowStockThreshold),
    lastRestocked: formatDate(p.updatedAt || p.createdAt),
  }
}

export const productService = {
  subscribe(onData: (products: UIProduct[]) => void, onError?: (err: Error) => void) {
    return subscribeProducts((firestoreList) => {
      onData(firestoreList.map(mapFirestoreProductToUI))
    }, onError)
  },

  async findById(productId: string): Promise<FirestoreProduct | null> {
    return fetchProductById(productId)
  },

  async createProduct(data: {
    productName: string
    categoryId: string
    categoryName: string
    price: number
    quantity: number
    lowStockThreshold?: number
  }): Promise<UIProduct> {
    if (!data.productName || data.productName.trim().length === 0) {
      throw new Error('Product name is required')
    }
    if (data.price < 0) {
      throw new Error('Price cannot be negative')
    }

    let productId = `PROD-${Math.floor(100000 + Math.random() * 900000)}`

    if (db) {
      try {
        await runTransaction(db, async (transaction) => {
          productId = await getNextSequentialId(transaction as any, 'product')
        })
      } catch (err) {
        console.warn('[ProductService] Fallback ID generation:', err)
      }
    }

    const nowSeconds = Math.floor(Date.now() / 1000)
    const newFirestoreDoc: FirestoreProduct = {
      productId,
      categoryId: data.categoryId,
      categoryName: data.categoryName,
      productName: data.productName.trim(),
      price: data.price,
      quantity: data.quantity,
      lowStockThreshold: data.lowStockThreshold ?? 10,
      isActive: true,
      createdAt: { seconds: nowSeconds, nanoseconds: 0 },
      updatedAt: { seconds: nowSeconds, nanoseconds: 0 },
    }

    if (db) {
      await createProductDoc(newFirestoreDoc)
    }

    return mapFirestoreProductToUI(newFirestoreDoc)
  },

  async updateStock(productId: string, newStock: number): Promise<void> {
    if (db) {
      await updateProductStockDoc(productId, newStock)
    }
  },

  async restock(productId: string, addedQty: number): Promise<void> {
    if (db) {
      await restockProductDoc(productId, addedQty)
    }
  },

  async deleteProduct(productId: string): Promise<void> {
    if (db) {
      await deleteProductDoc(productId)
    }
  },
}
