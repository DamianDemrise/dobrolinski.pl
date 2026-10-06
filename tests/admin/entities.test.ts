/** Ekrany encji: slug, status, adresy edycji, liczenie użyć komponentów globalnych. */
import type { Entity, PageDocument, PublishedSite } from '@demrise/cms-core'
import { describe, expect, it } from 'vitest'
import published from '../../content/published.json'
import { cleanExposed, countComponentUsages, entityEditPath, localStatus, slugError, slugify } from '../../app/admin/entities'
import { plural } from '../../app/admin/format'

const site = published as unknown as PublishedSite

const page = (id: string, draft: Partial<PageDocument>, pub: Partial<PageDocument> | null = null): Pick<Entity, 'id' | 'title' | 'draft' | 'published'> =>
  ({ id, title: id, draft: { blocks: [], ...draft } as PageDocument, published: pub ? { blocks: [], ...pub } as PageDocument : null })

describe('slug', () => {
  it('jak POST /api/entities w Workerze', () => {
    expect(slugError('stopka-2')).toBeNull()
    expect(slugError('a')).toBeNull()
    expect(slugError('')).toMatch(/Podaj/)
    for (const bad of ['-x', 'X', 'ą', 'a_b', 'a b', 'a'.repeat(65)]) expect(slugError(bad)).not.toBeNull()
  })
  it('slugify z polskiej nazwy', () => {
    expect(slugify('Stopka: Łódź i Żółć!')).toBe('stopka-lodz-i-zolc')
    expect(slugError(slugify('  Przycisk powrotu  '))).toBeNull()
  })
})

describe('status i adresy', () => {
  it('localStatus', () => {
    expect(localStatus({ a: 1 }, null)).toBe('draft')
    expect(localStatus({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe('published')
    expect(localStatus({ a: 1 }, { a: 2 })).toBe('changed')
  })
  it('entityEditPath', () => {
    expect(entityEditPath('page', 'page_home')).toBe('/admin/edit/page_home')
    expect(entityEditPath('global', 'global_site')).toBe('/admin/content?id=global_site')
    expect(entityEditPath('component', 'site-footer')).toBe('/admin/components?id=site-footer')
    expect(entityEditPath('tokens', 'tokens')).toBe('/admin/design')
  })
})

describe('countComponentUsages', () => {
  it('liczy strony z instancją po id albo slugu, w drafcie i wersji opublikowanej', () => {
    const components = [{ id: 'cmp_1', slug: 'stopka' }, { id: 'cmp_2', slug: 'kontakt' }, { id: 'cmp_3', slug: 'nic' }]
    const pages = [
      page('p1', { blocks: [{ id: 'a', type: 'global', ref: 'stopka', props: {} }, { id: 'b', type: 'global', ref: 'cmp_2', props: {} }] }, { blocks: [{ id: 'a', type: 'global', ref: 'stopka', props: {} }] }),
      page('p2', { blocks: [] }, { blocks: [{ id: 'z', type: 'global', ref: 'cmp_1', props: {} }] }),
      page('p3', { blocks: [{ id: 'q', type: 'current-project', props: {} }] }),
    ]
    const usage = countComponentUsages(components, pages)
    expect(usage.cmp_1!.pages.map(p => p.id)).toEqual(['p1', 'p2'])
    expect(usage.cmp_1!.instances).toBe(2) // blok 'a' w drafcie i w published liczony raz
    expect(usage.cmp_2!.pages.map(p => p.id)).toEqual(['p1'])
    expect(usage.cmp_3).toEqual({ pages: [], instances: 0 })
  })

  it('na treści opublikowanej: back-link na dwóch stronach, stopka i kontakt na głównej', () => {
    const pages = Object.entries(site.pages).map(([slug, doc]) => page(slug || 'home', doc, doc))
    const components = Object.keys(site.components).map(slug => ({ id: slug, slug }))
    const usage = countComponentUsages(components, pages)
    expect(usage['back-link']!.pages).toHaveLength(2)
    expect(usage['site-footer']!.pages.map(p => p.id)).toContain('home')
    expect(usage['contact-links']!.pages.map(p => p.id)).toEqual(['home'])
  })

  it('cleanExposed: tylko istniejące pola, w kolejności definicji', () => {
    expect(cleanExposed(['b', 'x', 'a'], ['a', 'b', 'c'])).toEqual(['a', 'b'])
  })
})

describe('plural', () => {
  it('odmiana liczebnika', () => {
    const forms: [string, string, string] = ['strona', 'strony', 'stron']
    expect([0, 1, 2, 4, 5, 12, 22, 25].map(n => plural(n, forms))).toEqual(['0 stron', '1 strona', '2 strony', '4 strony', '5 stron', '12 stron', '22 strony', '25 stron'])
  })
})
