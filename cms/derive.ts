/**
 * Wartości wyliczane z treści CMS (bez frameworka): używa ich strona, nuxt.config,
 * dostępy w app/content i testy. Jedno miejsce na formaty, które wcześniej były stałymi w kodzie.
 */
import { isSafeUrl } from '@demrise/cms-core'
import type { SiteGlobal, WorkshopGlobal } from './types'

/** „01 / POZNAJ CZŁOWIEKA” */
export const projectIndex = (workshop: Pick<WorkshopGlobal, 'number' | 'name'>) => `${workshop.number} / ${workshop.name}`

export const mailHref = (email: string, subject?: string) =>
  subject ? `mailto:${email}?subject=${encodeURIComponent(subject)}` : `mailto:${email}`

/** Schema.org Person (kolejność kluczy jak w opublikowanym JSON-LD). */
export const personSchema = (site: SiteGlobal) => ({
  '@context': 'https://schema.org',
  '@type': 'Person',
  'name': site.name,
  'url': site.url,
  'email': `mailto:${site.email}`,
  'telephone': site.telephone,
  'knowsAbout': site.areas.map(area => area.label),
})

export type LinkSegment = string | { href: string, label: string }

/** Rozbija tekst z [[adres|etykieta]] na zwykły tekst i linki (bez v-html). */
export function linkSegments(text: string): LinkSegment[] {
  const parts: LinkSegment[] = []
  let last = 0
  for (const match of text.matchAll(/\[\[([^|\]]+)\|([^\]]+)\]\]/g)) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    // Niebezpieczny adres (np. javascript:) zostaje zwykłym tekstem etykiety, nigdy linkiem.
    const href = match[1]!.trim()
    parts.push(isSafeUrl(href) ? { href, label: match[2]! } : match[2]!)
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}
