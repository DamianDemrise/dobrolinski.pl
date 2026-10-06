/** Bezpieczne adresy linków. */
import { hasControlChars } from './util'

/** http(s)://host, mailto:, tel:, /ścieżka, #kotwica. Odrzuca m.in. javascript:, data:, vbscript:, //host. */
export function isSafeUrl(href: string): boolean {
  if (typeof href !== 'string' || href === '') return false
  if (hasControlChars(href) || href !== href.trim() || href.includes('\\')) return false
  if (href.startsWith('#')) return true
  if (href.startsWith('/')) return !href.startsWith('//')
  const match = /^([a-z][a-z0-9+.-]*):(.*)$/i.exec(href)
  if (!match) return false
  const scheme = (match[1] ?? '').toLowerCase()
  const rest = match[2] ?? ''
  if (scheme === 'http' || scheme === 'https') return /^\/\/[^/?#\s]+/.test(rest)
  if (scheme === 'mailto' || scheme === 'tel') return rest.length > 0 && !/\s/.test(rest)
  return false
}
