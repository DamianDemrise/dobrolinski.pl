/**
 * Typowany dostęp do globalu `site` z content/published.json (źródło: CMS).
 * Komponenty dostają treść przez CMS (useCmsGlobals); ten moduł służy testom i ofercie PDF.
 */
import type { PublishedSite } from '@demrise/cms-core'
import published from '../../content/published.json'
import { personSchema as buildPersonSchema } from '../../cms/derive'
import type { Globals } from '../../cms/types'

export type { AreaItem as Area } from '../../cms/types'

export const publishedContent = published as unknown as PublishedSite
export const globals = publishedContent.globals as unknown as Globals

export const siteContent = globals.site

export const personSchema = buildPersonSchema(siteContent)
