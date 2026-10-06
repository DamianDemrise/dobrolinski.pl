/** Nowa strona z panelu: komunikaty adresu, pusty dokument w układzie, kopia strony. */
import { validatePage } from '@demrise/cms-core'
import type { ComponentDocument, PublishedSite } from '@demrise/cms-core'
import { describe, expect, it } from 'vitest'
import published from '../../content/published.json'
import { siteSchema } from '../../cms/schema'
import { slugify } from '../../vendor/demrise-cms/nuxt/app/admin/entities'
import { copyPage, emptyPage, layoutBlocks, pageSlugMessage, type ComponentOption } from '../../vendor/demrise-cms/nuxt/app/admin/new-page'

const site = published as unknown as PublishedSite
const components: ComponentOption[] = Object.entries(site.components).map(([id, doc]) => ({ id, doc: doc as ComponentDocument, published: true }))

describe('adres nowej strony', () => {
  it('slug z polskiego tytułu (transliteracja)', () => {
    expect(slugify('Żółć, gęślą jaźń — Łódź 2026!')).toBe('zolc-gesla-jazn-lodz-2026')
    expect(slugify('  Na końcu jest człowiek  ')).toBe('na-koncu-jest-czlowiek')
  })

  it('komunikaty: pusty, format, zarezerwowany, zajęty, poprawny', () => {
    const taken = ['', 'poznaj-czlowieka']
    expect(pageSlugMessage('', taken)).toMatch(/Podaj/)
    for (const bad of ['a/b', 'A', 'a--b', '-a', 'a_b']) expect(pageSlugMessage(bad, taken)).toMatch(/małe litery/)
    expect(pageSlugMessage('a'.repeat(65), taken)).toMatch(/64/)
    for (const reserved of ['admin', 'api', 'media', 'oferta', 'workshop', '404', 'index']) expect(pageSlugMessage(reserved, taken)).toMatch(/zarezerwowany/)
    expect(pageSlugMessage('poznaj-czlowieka', taken)).toMatch(/już istnieje/)
    expect(pageSlugMessage('nowa-strona', taken)).toBeNull()
  })
})

describe('pusty dokument w układzie', () => {
  for (const layout of Object.keys(siteSchema.layouts)) {
    it(`${layout}: stałe bloki układu, poprawny dokument strony`, () => {
      const doc = emptyPage('Nowa strona', 'nowa-strona', layout, siteSchema, components)
      expect(validatePage(doc, siteSchema, site.components)).toEqual([])
      expect(doc.blocks.length).toBeGreaterThan(0)
      expect(doc.seo).toMatchObject({ title: 'Nowa strona | Damian Dobroliński', canonical: 'https://dobrolinski.pl/nowa-strona', description: '', noindex: false })
    })
  }

  it('stały blok z komponentem globalnym → instancja komponentu; bez komponentu → wartości domyślne', () => {
    const workshop = layoutBlocks('workshop', siteSchema, components)
    expect(workshop.map(b => b.type === 'global' ? `global:${b.ref}` : b.type)).toEqual(['workshop-hero', 'workshop-closing', 'global:back-link'])
    const bare = layoutBlocks('workshop', siteSchema)
    expect(bare.map(b => b.type)).toEqual(['workshop-hero', 'workshop-closing', 'back-link'])
    expect(validatePage({ ...emptyPage('X', 'x', 'workshop', siteSchema), blocks: bare }, siteSchema)).toEqual([])
  })

  it('układ bez `starter`: bloki nieusuwalne z jego obszarów', () => {
    const schema = { ...siteSchema, layouts: { solo: { label: 'Solo', regions: ['ebook'] } } }
    expect(layoutBlocks('solo', schema).map(b => b.type)).toEqual(['ebook-hero', 'ebook-form'])
  })

  it('za długi tytuł: SEO title bez dopisku, w limicie 70 znaków', () => {
    const doc = emptyPage('A'.repeat(80), 'a', 'document', siteSchema, components)
    expect(doc.seo.title).toBe('A'.repeat(70))
  })
})

describe('kopia strony', () => {
  it('te same bloki i układ, nowe id bloków i elementów list, instancje komponentów zostają', () => {
    const source = site.pages['poznaj-czlowieka']!
    const copy = copyPage(source, 'Warsztat 2', 'warsztat-2')
    expect(validatePage(copy, siteSchema, site.components)).toEqual([])
    expect(copy).toMatchObject({ title: 'Warsztat 2', slug: 'warsztat-2', layout: source.layout })
    expect(copy.seo.canonical).toBe('https://dobrolinski.pl/warsztat-2')
    expect(copy.blocks.map(b => b.type)).toEqual(source.blocks.map(b => b.type))
    const sourceIds = new Set(source.blocks.map(b => b.id))
    expect(copy.blocks.every(b => !sourceIds.has(b.id))).toBe(true)
    expect(copy.blocks.filter(b => b.type === 'global').map(b => b.ref)).toEqual(source.blocks.filter(b => b.type === 'global').map(b => b.ref))
    const program = (b: { props: Record<string, unknown> }) => (b.props.topics as { _id?: string }[] | undefined)?.[0]?._id
    const i = source.blocks.findIndex(b => b.type === 'workshop-program')
    if (program(source.blocks[i]!)) expect(program(copy.blocks[i]!)).not.toBe(program(source.blocks[i]!))
  })
})
