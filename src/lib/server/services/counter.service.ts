import { subscribeCounter, fetchCounter } from '../repositories/counter.repository'
import { formatSequentialId } from '../../idGenerator'
import type { Unsubscribe } from 'firebase/firestore'

export const counterService = {
  /**
   * Subscribes to live Firestore counter document (e.g. counters/billing_2026)
   * and provides the formatted next sequential invoice ID (e.g. INV-2026-000001).
   */
  subscribeBillingSequence(
    onData: (nextSequence: string) => void,
    year: number = new Date().getFullYear(),
    onError?: (err: Error) => void
  ): Unsubscribe {
    return subscribeCounter(
      'billing',
      year,
      (counter) => {
        const lastCount = counter && typeof counter.lastValue === 'number' ? counter.lastValue : 0
        const nextId = formatSequentialId('billing', lastCount + 1, year)
        onData(nextId)
      },
      onError
    )
  },

  /**
   * Fetches the current live sequence directly from Firestore counters collection.
   */
  async getNextBillingSequence(year: number = new Date().getFullYear()): Promise<string> {
    const counter = await fetchCounter('billing', year)
    const lastCount = counter && typeof counter.lastValue === 'number' ? counter.lastValue : 0
    return formatSequentialId('billing', lastCount + 1, year)
  },
}
