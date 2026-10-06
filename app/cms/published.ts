/**
 * Opublikowana treść (content/published.json) wbudowana statycznie w build.
 * Publiczna strona nigdy nie pobiera treści w trakcie działania.
 */
import type { PageDocument, PublishedSite } from '@demrise/cms-core'
import data from '~~/content/published.json'

export const publishedSite = data as unknown as PublishedSite

/** Czy strona jest opublikowana (strony dodane w panelu istnieją publicznie dopiero po publikacji). */
export const hasPublishedPage = (slug: string): boolean => Object.hasOwn(publishedSite.pages, slug)

export function publishedPage(slug: string): PageDocument {
  const page = Object.hasOwn(publishedSite.pages, slug) ? publishedSite.pages[slug] : undefined
  if (!page) throw new Error(`Brak opublikowanej strony "${slug}" w content/published.json`)
  return page
}
