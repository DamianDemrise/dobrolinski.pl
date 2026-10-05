/**
 * Kontrakt formularza oferty POZNAJ CZŁOWIEKA, wspólny dla strony (app/)
 * i endpointu (offer-worker/). Bez zależności: plik działa w przeglądarce,
 * w Cloudflare Workers i w Node.
 */

/** Pola, które endpoint przyjmuje. Wszystko inne jest ignorowane. */
export interface OfferRequest {
  email: string
  /** Honeypot: człowiek go nie widzi, więc zostawia pusty. */
  website?: string
  /** Ile milisekund formularz był na ekranie przed wysłaniem. */
  elapsed?: number
  /** Ścieżka strony i UTM, tylko do powiadomienia dla Damiana. */
  source?: OfferSource
}

export interface OfferSource {
  page?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
}

export type OfferErrorCode = 'invalid_email' | 'rate_limited' | 'unavailable' | 'bad_request'

export type OfferResponse = { ok: true } | { ok: false, error: OfferErrorCode }

export const EMAIL_MAX_LENGTH = 254
export const SOURCE_VALUE_MAX_LENGTH = 64

/** Trim i małe litery. Adres i tak trafia do dostawcy jako osobne pole JSON. */
export function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

/**
 * Praktyczna walidacja, nie pełne RFC 5322: jedna małpa, część lokalna
 * i domena z kropką, bez spacji, przecinków, nawiasów kątowych i znaków
 * sterujących (to wyklucza też wstrzyknięcie nagłówków).
 */
const EMAIL_PATTERN = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,63}$/

export function isValidEmail(email: string): boolean {
  if (!email || email.length > EMAIL_MAX_LENGTH) return false
  const local = email.split('@')[0] ?? ''
  if (local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false
  return EMAIL_PATTERN.test(email)
}

/** Zostawia tylko krótkie, bezpieczne wartości źródła; resztę wycina. */
export function sanitizeSource(value: unknown): OfferSource {
  if (!value || typeof value !== 'object') return {}
  const input = value as Record<string, unknown>
  const clean = (raw: unknown, pattern: RegExp) => {
    if (typeof raw !== 'string') return undefined
    const text = raw.trim().slice(0, SOURCE_VALUE_MAX_LENGTH)
    return pattern.test(text) ? text : undefined
  }
  const token = /^[\w.-]+$/
  const result: OfferSource = {
    page: clean(input.page, /^\/[\w\-/]*$/),
    utm_source: clean(input.utm_source, token),
    utm_medium: clean(input.utm_medium, token),
    utm_campaign: clean(input.utm_campaign, token),
  }
  return Object.fromEntries(Object.entries(result).filter(([, v]) => v)) as OfferSource
}
