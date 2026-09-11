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

  async createCategory(categoryName: string): Promise<Category> {
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
      createdAt: { seconds: nowSeconds, nanoseconds: 0 },
      updatedAt: { seconds: nowSeconds, nanoseconds: 0 },
    }

    if (db) {
      await createCategoryDoc(categoryDoc)
    }

    return categoryDoc
  },

  async updateCategory(categoryId: string, categoryName: string): Promise<void> {
    if (db) {
      await updateCategoryDoc(categoryId, { categoryName: categoryName.trim() })
    }
  },

  async deleteCategory(categoryId: string): Promise<void> {
    if (db) {
      await deleteCategoryDoc(categoryId)
    }
  },

  async createBulkCategories(
    categoryNames: string[]
  ): Promise<{ added: Category[]; skipped: string[] }> {
    const existing = await fetchCategories().catch(() => [])
    const existingNames = new Set(existing.map((c) => c.categoryName.trim().toLowerCase()))

    const added: Category[] = []
    const skipped: string[] = []

    for (const rawName of categoryNames) {
      const trimmed = typeof rawName === 'string' ? rawName.trim() : ''
      if (!trimmed) continue
      if (existingNames.has(trimmed.toLowerCase())) {
        skipped.push(trimmed)
        continue
      }
      try {
        const cat = await this.createCategory(trimmed)
        added.push(cat)
        existingNames.add(trimmed.toLowerCase())
      } catch (err) {
        console.warn('[CategoryService] Bulk item failed:', trimmed, err)
      }
    }
    return { added, skipped }
  },
}
