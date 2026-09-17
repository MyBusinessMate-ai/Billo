/**
 * Pure, stateless formatting utilities.
 */

/**
 * Format a number as Indian Rupee (INR) currency.
 * e.g., 1250 -> "₹1,250.00"
 */
export function formatINR(amount: number, includeDecimals: boolean = true): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '₹0.00'
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(amount)
}

/**
 * Strips non-digit characters from phone number (preserves leading '+').
 */
export function sanitizePhone(phone: string): string {
  if (!phone) return ''
  const trimmed = phone.trim()
  if (trimmed.startsWith('+')) {
    return '+' + trimmed.slice(1).replace(/\D/g, '')
  }
  return trimmed.replace(/\D/g, '')
}

/**
 * Formats a 10-digit Indian phone number: "+91 98765 43210" or "98765 43210"
 */
export function formatPhoneNumber(phone: string): string {
  const clean = sanitizePhone(phone)
  if (clean.length === 10) {
    return `${clean.slice(0, 5)} ${clean.slice(5)}`
  }
  if (clean.length === 12 && clean.startsWith('91')) {
    return `+91 ${clean.slice(2, 7)} ${clean.slice(7)}`
  }
  if (clean.startsWith('+91') && clean.length === 13) {
    return `+91 ${clean.slice(3, 8)} ${clean.slice(8)}`
  }
  return phone
}

/**
 * Formats standard date string 'YYYY-MM-DD'
 */
export function formatDate(
  val: Date | string | { seconds: number; nanoseconds?: number } | undefined | null
): string {
  if (!val) return ''
  let date: Date

  if (val instanceof Date) {
    date = val
  } else if (typeof val === 'string') {
    date = new Date(val)
  } else if (typeof val === 'object' && typeof val.seconds === 'number') {
    date = new Date(val.seconds * 1000)
  } else {
    return ''
  }

  if (isNaN(date.getTime())) return ''

  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Formats standard time string 'HH:mm:ss'
 */
export function formatTime(
  val: Date | string | { seconds: number; nanoseconds?: number } | undefined | null
): string {
  if (!val) return ''
  let date: Date

  if (val instanceof Date) {
    date = val
  } else if (typeof val === 'string') {
    date = new Date(val)
  } else if (typeof val === 'object' && typeof val.seconds === 'number') {
    date = new Date(val.seconds * 1000)
  } else {
    return ''
  }

  if (isNaN(date.getTime())) return ''

  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${h}:${min}:${s}`
}

/**
 * Formats full datetime string 'YYYY-MM-DD HH:mm:ss'
 */
export function formatDateTime(
  val: Date | string | { seconds: number; nanoseconds?: number } | undefined | null
): string {
  const d = formatDate(val)
  const t = formatTime(val)
  if (!d) return ''
  return `${d} ${t}`
}

/**
 * Truncate long strings with ellipsis.
 */
export function truncate(str: string, maxLength: number = 30): string {
  if (!str) return ''
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 1) + '…'
}

/**
 * Converts a numeric amount into Indian Currency Words (Lakhs & Crores format)
 * e.g., 11900 -> "Rupees Eleven Thousand Nine Hundred Only"
 * e.g., 10084.74 -> "Rupees Ten Thousand Eighty Four and Seventy Four Paise Only"
 */
const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
]

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function convertChunk(n: number): string {
  let str = ''
  if (n >= 100) {
    str += ONES[Math.floor(n / 100)] + ' Hundred '
    n %= 100
  }
  if (n >= 20) {
    str += TENS[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ONES[n % 10] : '') + ' '
  } else if (n > 0) {
    str += ONES[n] + ' '
  }
  return str.trim()
}

export function numberToWordsIndian(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Rupees Zero Only'

  const absolute = Math.abs(amount)
  const rupees = Math.floor(absolute)
  const paise = Math.round((absolute - rupees) * 100)

  let words = ''

  const crore = Math.floor(rupees / 10000000)
  const lakh = Math.floor((rupees % 10000000) / 100000)
  const thousand = Math.floor((rupees % 100000) / 1000)
  const hundred = rupees % 1000

  if (crore > 0) {
    words += convertChunk(crore) + ' Crore '
  }
  if (lakh > 0) {
    words += convertChunk(lakh) + ' Lakh '
  }
  if (thousand > 0) {
    words += convertChunk(thousand) + ' Thousand '
  }
  if (hundred > 0) {
    words += convertChunk(hundred) + ' '
  }

  words = words.trim()
  if (!words) words = 'Zero'

  let result = 'Rupees ' + words
  if (paise > 0) {
    result += ' and ' + convertChunk(paise) + ' Paise'
  }
  result += ' Only'

  return result
}

/**
 * Generates a valid UPI payment URL string.
 * e.g., upi://pay?pa=store@upi&pn=StoreName&am=1250.00&cu=INR&tn=Invoice+1048
 */
export function generateUPIUrl(options: {
  upiId?: string
  payeeName?: string
  amount?: number
  invoiceId?: string
}): string {
  const upiId = options.upiId?.trim() || 'pos@upi'
  const payeeName = options.payeeName?.trim() || 'Store'
  const params = new URLSearchParams()
  params.set('pa', upiId)
  params.set('pn', payeeName)
  if (options.amount && options.amount > 0) {
    params.set('am', options.amount.toFixed(2))
    params.set('cu', 'INR')
  }
  if (options.invoiceId) {
    params.set('tn', `Invoice ${options.invoiceId}`)
  }
  return `upi://pay?${params.toString()}`
}

/**
 * Recursively strips undefined values from an object before saving to Firestore.
 */
export function cleanFirestoreData<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) {
    return obj.map(cleanFirestoreData) as unknown as T
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {}
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanFirestoreData(value)
      }
    }
    return cleaned as T
  }
  return obj
}

/**
 * Applies text casing normalization.
 * Supported modes: 'uppercase' | 'lowercase' | 'normal'
 */
export function applyTextCasing(
  val: any,
  casing?: 'uppercase' | 'lowercase' | 'normal' | string
): string {
  if (val === undefined || val === null) return ''
  const str = String(val)
  if (casing === 'uppercase') return str.toUpperCase()
  if (casing === 'lowercase') return str.toLowerCase()
  return str
}
