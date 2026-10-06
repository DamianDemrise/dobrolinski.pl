/** Snapshot opublikowanej treści (wejście buildu publicznej strony). */
import { emptyTokens } from './tokens'
import type { ComponentDocument, Entity, GlobalDocument, PageDocument, PublishedSite, TokensDocument } from './types'

/** Tylko `published`; encje bez publikacji i wzorce są pomijane. */
export function buildPublishedSite(entities: Entity[], now: Date = new Date()): PublishedSite {
  const pages: Record<string, PageDocument> = {}
  const globals: Record<string, GlobalDocument> = {}
  const components: Record<string, ComponentDocument> = {}
  let tokens: TokensDocument | undefined
  for (const e of entities) {
    if (e.published === null || e.published === undefined) continue
    const key = e.kind === 'component' ? e.id : e.slug
    if (key === '__proto__') continue
    if (e.kind === 'page') pages[key] = e.published as PageDocument
    else if (e.kind === 'global') globals[key] = e.published as GlobalDocument
    else if (e.kind === 'component') components[key] = e.published as ComponentDocument
    else if (e.kind === 'tokens' && !tokens) tokens = e.published as TokensDocument
  }
  return { generatedAt: now.toISOString(), pages, globals, components, tokens: tokens ?? emptyTokens() }
}

/** Slug bez ukośników na brzegach; '' i '/' = strona główna. */
export function pageDocumentForSlug(site: PublishedSite, slug: string): PageDocument | undefined {
  const key = slug.replace(/^\/+|\/+$/g, '')
  return Object.hasOwn(site.pages, key) ? site.pages[key] : undefined
}
