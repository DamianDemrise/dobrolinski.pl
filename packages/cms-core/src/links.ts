/** Linki w tekście: składnia [[adres|etykieta]] (bez HTML). */
import { isSafeUrl } from './url'

export type LinkSegment = string | { href: string, label: string }

const LINK_RE = /\[\[([^|\]]+)\|([^\]]+)\]\]/g

/** Wszystkie adresy z [[adres|etykieta]] w tekście. */
export function linkMarkupHrefs(text: string): string[] {
  return [...text.matchAll(LINK_RE)].map(m => m[1] ?? '')
}

/** Tekst podzielony na zwykły tekst i linki; link z niebezpiecznym adresem staje się zwykłym tekstem (etykietą). */
export function safeLinkSegments(text: string): LinkSegment[] {
  const parts: LinkSegment[] = []
  const push = (s: string) => {
    if (s === '') return
    if (typeof parts.at(-1) === 'string') parts[parts.length - 1] = (parts.at(-1) as string) + s
    else parts.push(s)
  }
  let last = 0
  for (const m of text.matchAll(LINK_RE)) {
    push(text.slice(last, m.index))
    const href = m[1] ?? ''
    const label = m[2] ?? ''
    if (isSafeUrl(href)) parts.push({ href, label })
    else push(label)
    last = m.index + m[0].length
  }
  push(text.slice(last))
  return parts
}
