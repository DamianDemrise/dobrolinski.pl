/**
 * Nowa strona z panelu: komunikat o adresie, dokument pusty (bloki stałe układu) albo kopia
 * istniejącej strony. Czyste funkcje bez Vue i API (tests/admin/new-page.test.ts).
 * Wynik przechodzi validatePage z rdzenia, tak jak sprawdza go POST /api/entities.
 */
import { freshListIds, newId } from '@demrise/cms-core'
import type { BlockInstance, ComponentDocument, PageDocument, SiteSchema } from '@demrise/cms-core'
import { newPageSeo, PAGE_SLUG_MAX, pageSlugProblem } from '~~/cms/pages'
import { newBlockProps } from './editor/defaults'

/** Błąd adresu po polsku albo null; `taken` = slugi istniejących stron (także szkiców). */
export function pageSlugMessage(slug: string, taken: readonly string[]): string | null {
  switch (pageSlugProblem(slug)) {
    case 'empty': return 'Podaj adres strony'
    case 'too_long': return `Adres może mieć najwyżej ${PAGE_SLUG_MAX} znaki`
    case 'format': return 'Tylko małe litery a–z, cyfry i pojedyncze myślniki między nimi (bez ukośników)'
    case 'reserved': return 'Ten adres jest zarezerwowany dla strony lub panelu'
  }
  return taken.includes(slug) ? 'Strona o tym adresie już istnieje' : null
}

/** Komponent globalny do podstawienia za blok stały danego typu (np. przycisk powrotu, stopka). */
export interface ComponentOption { id: string, doc: ComponentDocument, published: boolean }

function componentFor(type: string, components: readonly ComponentOption[]): ComponentOption | undefined {
  const matching = components.filter(c => c.doc.blockType === type)
  return matching.find(c => c.published) ?? matching[0]
}

/**
 * Typy bloków startowych układu: `starter` ze schematu, a bez niego bloki nieusuwalne
 * z obszarów układu (w kolejności obszarów, potem schematu).
 */
function starterTypes(layout: string, schema: SiteSchema): string[] {
  const def = Object.hasOwn(schema.layouts, layout) ? schema.layouts[layout]! : undefined
  if (!def) return []
  if (def.starter) return def.starter
  const blocks = Object.values(schema.blocks)
  return def.regions.flatMap(region => blocks.filter(b => b.region === region && b.restrictions.removable === false).map(b => b.type))
}

/**
 * Bloki startowe układu. Gdy istnieje komponent globalny tego typu, wstawiamy jego instancję
 * (ta sama treść co na innych stronach), inaczej blok z wartościami domyślnymi schematu.
 */
export function layoutBlocks(layout: string, schema: SiteSchema, components: readonly ComponentOption[] = []): BlockInstance[] {
  return starterTypes(layout, schema)
    .filter(type => Object.hasOwn(schema.blocks, type))
    .map((type): BlockInstance => {
      const component = componentFor(type, components)
      return component
        ? { id: newId('b'), type: 'global', ref: component.id, props: {}, overrides: {} }
        : { id: newId('b'), type, props: newBlockProps(schema.blocks[type]!) }
    })
}

export function emptyPage(title: string, slug: string, layout: string, schema: SiteSchema, components: readonly ComponentOption[] = []): PageDocument {
  return { title: title.trim(), slug, layout, seo: newPageSeo(title, slug), blocks: layoutBlocks(layout, schema, components) }
}

/** Kopia strony: ten sam układ i bloki z nowymi id (bloków i elementów list); instancje komponentów zostają. */
export function copyPage(source: PageDocument, title: string, slug: string): PageDocument {
  const blocks = source.blocks.map((block): BlockInstance => {
    // JSON-kopia: źródło może być reaktywnym proxy Vue.
    const copy = freshListIds(JSON.parse(JSON.stringify(block)) as BlockInstance)
    return { ...copy, id: newId('b') }
  })
  return { title: title.trim(), slug, layout: source.layout, seo: newPageSeo(title, slug), blocks }
}
