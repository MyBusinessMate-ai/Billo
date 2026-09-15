import {
  fetchCategories,
  fetchCategoryById,
  createCategoryDoc,
  updateCategoryDoc,
  deleteCategoryDoc,
  subscribeCategories,
} from '../repositories/category.repository'
import { getNextSequentialId } from '../repositories/counter.repository'
import { db } from '../../firebase'
import { runTransaction } from 'firebase/firestore'
import type { Category } from '../../../types/schema'

export const categoryService = {
  subscribe(onData: (categories: Category[]) => void, onError?: (err: Error) => void) {
    return subscribeCategories(onData, onError)
  },

  async getAll(): Promise<Category[]> {
    return fetchCategories()
  },

  async getById(categoryId: string): Promise<Category | null> {
    return fetchCategoryById(categoryId)
  },

  async createCategory(categoryName: string, basePrice?: number): Promise<Category> {
    const trimmed = categoryName.trim()
    if (!trimmed) {
      throw new Error('Category name is required')
    }

    let categoryId = `CAT-${Math.floor(100000 + Math.random() * 900000)}`

    if (db) {
      try {
        await runTransaction(db, async (transaction) => {
          categoryId = await getNextSequentialId(transaction as any, 'category')
        })
      } catch (err) {
        console.warn('[CategoryService] Fallback ID generation:', err)
      }
    }

    const nowSeconds = Math.floor(Date.now() / 1000)
    const categoryDoc: Category = {
      categoryId,
      categoryName: trimmed,
      ...(typeof basePrice === 'number' && !isNaN(basePrice) ? { basePrice } : {}),
      createdAt: { seconds: nowSeconds, nanoseconds: 0 },
      updatedAt: { seconds: nowSeconds, nanoseconds: 0 },
    }

    if (db) {
      await createCategoryDoc(categoryDoc)
    }

    return categoryDoc
  },

  async updateCategory(
    categoryId: string,
    data: { categoryName?: string; basePrice?: number }
  ): Promise<void> {
    if (db) {
      const payload: Partial<Category> = {}
      if (data.categoryName !== undefined) {
        payload.categoryName = data.categoryName.trim()
      }
      if (data.basePrice !== undefined) {
        payload.basePrice =
          typeof data.basePrice === 'number' && !isNaN(data.basePrice) ? data.basePrice : undefined
      }
      await updateCategoryDoc(categoryId, payload)
    }
  },

  async deleteCategory(categoryId: string): Promise<void> {
    if (db) {
      await deleteCategoryDoc(categoryId)
    }
  },

  async createBulkCategories(
    items: Array<string | { categoryName: string; basePrice?: number }>
  ): Promise<{ added: Category[]; skipped: string[] }> {
    const existing = await fetchCategories().catch(() => [])
    const existingNames = new Set(existing.map((c) => c.categoryName.trim().toLowerCase()))

    const added: Category[] = []
    const skipped: string[] = []

    for (const item of items) {
      const name = typeof item === 'string' ? item.trim() : (item.categoryName || '').trim()
      const price = typeof item === 'object' && item !== null ? item.basePrice : undefined
      if (!name) continue
      if (existingNames.has(name.toLowerCase())) {
        skipped.push(name)
        continue
      }
      try {
        const cat = await this.createCategory(name, price)
        added.push(cat)
        existingNames.add(name.toLowerCase())
      } catch (err) {
        console.warn('[CategoryService] Bulk item failed:', name, err)
      }
    }
    return { added, skipped }
  },
}
