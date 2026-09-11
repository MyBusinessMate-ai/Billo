/**
 * Pure, stateless business calculation helpers.
 */

/**
 * Calculates line total (quantity * unitPrice), rounded to 2 decimals.
 */
export function calculateLineTotal(unitPrice: number, quantity: number): number {
  if (unitPrice < 0 || quantity <= 0) return 0
  return Math.round(unitPrice * quantity * 100) / 100
}

/**
 * Calculates subtotal from a list of items.
 */
export function calculateSubtotal(
  items: Array<{ price: number; quantity: number } | { unitPrice: number; quantity: number }>
): number {
  const sum = items.reduce((acc, item) => {
    const price = 'price' in item ? item.price : item.unitPrice
    return acc + calculateLineTotal(price, item.quantity)
  }, 0)
  return Math.round(sum * 100) / 100
}

/**
 * Calculates tax amount given a subtotal and tax percentage rate.
 */
export function calculateTaxAmount(taxableAmount: number, taxRatePercent: number): number {
  if (taxableAmount <= 0 || taxRatePercent <= 0) return 0
  return Math.round(taxableAmount * (taxRatePercent / 100) * 100) / 100
}

/**
 * Calculates discount amount.
 */
export function calculateDiscountAmount(
  subtotal: number,
  discount: { type: 'percent' | 'flat'; value: number } | number
): number {
  if (!discount || subtotal <= 0) return 0
  if (typeof discount === 'number') {
    return Math.min(subtotal, Math.max(0, Math.round(discount * 100) / 100))
  }
  if (discount.type === 'percent') {
    const rate = Math.min(100, Math.max(0, discount.value))
    return Math.round(subtotal * (rate / 100) * 100) / 100
  }
  return Math.min(subtotal, Math.max(0, Math.round(discount.value * 100) / 100))
}

/**
 * Calculates final invoice total: Subtotal - Discount + Tax.
 */
export function calculateNetTotal(
  subtotal: number,
  taxAmount: number,
  discountAmount: number
): number {
  const total = Math.max(0, subtotal - discountAmount + taxAmount)
  return Math.round(total * 100) / 100
}

/**
 * Calculates percentage profit margin: ((Selling Price - Cost Price) / Selling Price) * 100
 */
export function calculateProfitMargin(sellingPrice: number, costPrice: number): number {
  if (sellingPrice <= 0) return 0
  const margin = ((sellingPrice - costPrice) / sellingPrice) * 100
  return Math.round(margin * 10) / 10
}
