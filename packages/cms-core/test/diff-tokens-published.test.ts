// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { buildPublishedSite, colorTokenVar, diffValues, emptyTokens, pageDocumentForSlug, stableStringify, tokensToCss } from '../src/index'
import type { Entity, TokensDocument } from '../src/index'
import { deepFreeze, makePage } from './fixtures'

describe('diffValues', () => {
  it('liście, tablice po indeksie', () => {
    expect(diffValues({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 3 } })).toEqual([{ path: 'b.c', before: 2, after: 3 }])
    expect(diffValues([1, 2], [1, 3, 4])).toEqual([{ path: '1', before: 2, after: 3 }, { path: '2', before: undefined, after: 4 }])
    expect(diffValues({ a: 1 }, { a: 1 })).toEqual([])
    expect(diffValues(1, 2, 'x')).toEqual([{ path: 'x', before: 1, after: 2 }])
  })
  it('dodane/usunięte obiekty rozpisane na liście; puste i zmiana typu jako liść', () => {
    expect(diffValues({}, { a: { b: 1, c: 2 } })).toEqual([{ path: 'a.b', before: undefined, after: 1 }, { path: 'a.c', before: undefined, after: 2 }])
    expect(diffValues({ a: [1] }, {})).toEqual([{ path: 'a.0', before: 1, after: undefined }])
    expect(diffValues({}, { a: {} })).toEqual([{ path: 'a', before: undefined, after: {} }])
    expect(diffValues({ a: [1] }, { a: { 0: 1 } })).toEqual([{ path: 'a', before: [1], after: { 0: 1 } }])
    expect(diffValues({ a: 'x' }, { a: { b: 1 } })).toEqual([{ path: 'a', before: 'x', after: { b: 1 } }])
  })
})

describe('stableStringify', () => {
  it('sortuje klucze rekurencyjnie, pomija undefined', () => {
    expect(stableStringify({ b: 1, a: { d: [{ z: 1, y: 2 }], c: undefined } })).toBe('{"a":{"d":[{"y":2,"z":1}]},"b":1}')
    expect(stableStringify({ a: 1, b: 2 })).toBe(stableStringify({ b: 2, a: 1 }))
    expect(stableStringify([undefined, 1])).toBe('[null,1]')
    expect(stableStringify(undefined)).toBe('null')
    expect(stableStringify('x')).toBe('"x"')
  })
})

describe('tokens', () => {
  const tokens: TokensDocument = deepFreeze({
    colors: { gold: { value: '#c9a227', label: 'Złoty' }, evil: { value: 'red; } body { x', label: '' } },
    typography: { h1: { value: '700 3rem/1.1 Inter', label: 'H1' } },
    spacing: { md: { value: '1.5rem', label: 'M' } },
    widths: { content: { value: '72rem', label: 'Treść' } },
    radius: { sm: { value: '4px', label: 'S' } },
    breakpoints: { md: { value: '768px', label: 'Tablet' } },
  })
  it('tokensToCss', () => {
    expect(tokensToCss(tokens)).toBe(
      ':root {\n  --color-gold: #c9a227;\n  --type-h1: 700 3rem/1.1 Inter;\n  --space-md: 1.5rem;\n  --width-content: 72rem;\n  --radius-sm: 4px;\n}\n',
    )
    expect(tokensToCss(emptyTokens(), '.cms')).toBe('.cms {\n\n}\n')
  })
  it('colorTokenVar', () => {
    expect(colorTokenVar('gold')).toBe('var(--color-gold)')
  })
})

describe('published', () => {
  const base = { draftRev: 1, publishedAt: null, publishedBy: null, updatedAt: '2026-10-06T00:00:00Z', updatedBy: null }
  const page = makePage()
  const tokens = { ...emptyTokens(), colors: { gold: { value: '#c9a227', label: 'Z' } } }
  const entities = deepFreeze([
    { ...base, id: 'p1', kind: 'page', slug: '', title: 'Główna', draft: { ...page, title: 'DRAFT' }, published: page },
    { ...base, id: 'p2', kind: 'page', slug: 'oferta', title: 'Oferta', draft: { ...page, slug: 'oferta' }, published: null },
    { ...base, id: 'p3', kind: 'page', slug: 'o-mnie', title: 'O mnie', draft: page, published: { ...page, slug: 'o-mnie' } },
    { ...base, id: 'g1', kind: 'global', slug: 'site', title: 'Strona', draft: { phone: 'DRAFT' }, published: { phone: '1' } },
    { ...base, id: 'g2', kind: 'global', slug: 'nav', title: 'Nav', draft: {}, published: null },
    { ...base, id: 'cmp1', kind: 'component', slug: 'cta', title: 'CTA', draft: { name: 'D', blockType: 'hero', props: {}, exposed: [] }, published: { name: 'CTA', blockType: 'hero', props: {}, exposed: [] } },
    { ...base, id: 'pat1', kind: 'pattern', slug: 'p', title: 'P', draft: { name: 'P', blocks: [] }, published: { name: 'P', blocks: [] } },
    { ...base, id: 't1', kind: 'tokens', slug: 'tokens', title: 'Tokeny', draft: emptyTokens(), published: tokens },
  ]) as Entity[]

  it('buildPublishedSite: tylko published, klucze wg slug/id', () => {
    const site = buildPublishedSite(entities, new Date('2026-10-06T10:00:00Z'))
    expect(site.generatedAt).toBe('2026-10-06T10:00:00.000Z')
    expect(Object.keys(site.pages).sort()).toEqual(['', 'o-mnie'])
    expect(site.pages['']!.title).toBe('Główna')
    expect(site.globals).toEqual({ site: { phone: '1' } })
    expect(Object.keys(site.components)).toEqual(['cmp1'])
    expect(site.components.cmp1!.name).toBe('CTA')
    expect(site.tokens).toEqual(tokens)
    expect(JSON.stringify(site)).not.toContain('DRAFT')
    expect(JSON.stringify(site)).not.toContain('"blocks":[]}')
  })
  it('bez tokenów → puste tokeny', () => {
    expect(buildPublishedSite([]).tokens).toEqual(emptyTokens())
  })
  it('pageDocumentForSlug', () => {
    const site = buildPublishedSite(entities)
    expect(pageDocumentForSlug(site, '')?.title).toBe('Główna')
    expect(pageDocumentForSlug(site, '/')?.title).toBe('Główna')
    expect(pageDocumentForSlug(site, '/o-mnie/')?.slug).toBe('o-mnie')
    expect(pageDocumentForSlug(site, 'oferta')).toBeUndefined()
    expect(pageDocumentForSlug(site, 'constructor')).toBeUndefined()
  })
})
