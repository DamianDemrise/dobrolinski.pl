/**
 * Typowany dostęp do warsztatu POZNAJ CZŁOWIEKA w content/published.json:
 * global `workshop` (dane produktu) i bloki strony /poznaj-czlowieka.
 * Ceny pilotażowej celowo tu nie ma: Damian proponuje ją indywidualnie.
 */
import type { PageDocument } from '@demrise/cms-core'
import { mailHref, projectIndex } from '../../cms/derive'
import type { BlockPropsMap, BlockType, SeoExtra } from '../../cms/types'
import { globals, publishedContent, siteContent } from './site'

export const workshopPage = publishedContent.pages['poznaj-czlowieka'] as PageDocument & { seo: SeoExtra }

export const workshop = globals.workshop

export function pageBlock<T extends BlockType>(page: PageDocument, type: T): BlockPropsMap[T] {
  const block = page.blocks.find(item => item.type === type)
  if (!block) throw new Error(`Brak bloku ${type} na stronie "${page.slug}"`)
  return block.props as unknown as BlockPropsMap[T]
}

export const workshopBlock = <T extends BlockType>(type: T) => pageBlock(workshopPage, type)

export const workshopIndex = projectIndex(workshop)

export const workshopMailHref = mailHref(siteContent.email, workshop.mailSubject)
