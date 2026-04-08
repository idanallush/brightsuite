/**
 * Budget-specific format utilities.
 * Re-exports compatible functions from shared format.ts and adds budget-specific ones.
 */

// Re-export shared formatters (these have compatible signatures for budget use)
export { formatCurrency, formatDate, formatDateTime } from '@/lib/format'

/**
 * Format date as DD.MM.YYYY
 */
export const formatDateFull = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}

/**
 * Get days in a specific month
 */
export { getDaysInMonth } from '@/lib/budget/forecast'

/**
 * Get today as YYYY-MM-DD
 */
export const todayISO = (): string => {
  return new Date().toISOString().split('T')[0]
}

/**
 * Generate a URL-friendly slug from text.
 * Supports Hebrew by keeping Unicode letters (\p{L}) alongside ASCII.
 * Falls back to a short random ID if the result is empty.
 */
export const slugify = (text: string): string => {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || `client-${crypto.randomUUID().slice(0, 8)}`
}

/**
 * Generate a random share token
 */
export const generateShareToken = (): string => {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16)
}
