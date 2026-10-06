/** Wskaźniki długości SEO (ekran SEO). Te same zalecenia co SeoPanel edytora. */

export const SEO_LIMITS = {
  title: { min: 30, max: 60 },
  description: { min: 70, max: 160 },
} as const

export type LengthState = 'ok' | 'short' | 'long' | 'empty'

export function lengthCheck(key: keyof typeof SEO_LIMITS, value: unknown): { state: LengthState, length: number, label: string } {
  const length = typeof value === 'string' ? value.trim().length : 0
  const { min, max } = SEO_LIMITS[key]
  if (length === 0) return { state: 'empty', length, label: 'brak' }
  if (length < min) return { state: 'short', length, label: `${length} zn. · za krótki` }
  if (length > max) return { state: 'long', length, label: `${length} zn. · za długi` }
  return { state: 'ok', length, label: `${length} zn.` }
}
