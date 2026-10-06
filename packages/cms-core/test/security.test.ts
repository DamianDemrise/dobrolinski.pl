// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { linkMarkupHrefs, requiredPermissions, safeLinkSegments, validateEntityData, validateFields, validatePage } from '../src/index'
import type { BlockInstance, ComponentDocument, FieldDef, PageDocument } from '../src/index'
import { deepFreeze, makePage, schema } from './fixtures'

const paths = (issues: { path: string }[]) => issues.map(i => i.path)

describe('linki [[adres|etykieta]]', () => {
  it('linkMarkupHrefs', () => {
    expect(linkMarkupHrefs('a [[/x|X]] b [[https://y.pl|Y]]')).toEqual(['/x', 'https://y.pl'])
    expect(linkMarkupHrefs('brak')).toEqual([])
  })
  it('safeLinkSegments: bezpieczne linki zostają, niebezpieczne stają się tekstem', () => {
    expect(safeLinkSegments('Zobacz [[/polityka|politykę]].')).toEqual(['Zobacz ', { href: '/polityka', label: 'politykę' }, '.'])
    for (const href of ['javascript:alert(1)', 'JaVaScRiPt:x', 'javascript&colon;x', 'data:text/html,<b>', 'vbscript:x', '//evil.com']) {
      expect(safeLinkSegments(`A [[${href}|tu]] B`)).toEqual(['A tu B'])
    }
    expect(safeLinkSegments('')).toEqual([])
  })
})

describe('format pól tekstowych', () => {
  const fields: FieldDef[] = [
    { key: 'href', label: 'Adres', type: 'text', format: 'url' },
    { key: 'body', label: 'Treść', type: 'textarea', format: 'links' },
    { key: 'items', label: 'Punkty', type: 'lines', format: 'links' },
  ]
  it("format 'url': pusty albo bezpieczny", () => {
    expect(validateFields(fields, { href: '' })).toEqual([])
    expect(validateFields(fields, { href: 'tel:+48123' })).toEqual([])
    expect(paths(validateFields(fields, { href: 'javascript:alert(1)' }))).toEqual(['href'])
    expect(paths(validateFields(fields, { href: '//evil.com' }))).toEqual(['href'])
  })
  it("format 'links': każdy adres w [[…|…]] bezpieczny (textarea i lines)", () => {
    expect(validateFields(fields, { body: 'a [[/x|X]]\nb [[mailto:a@b.pl|M]]' })).toEqual([])
    expect(paths(validateFields(fields, { body: 'ok [[/x|X]] zle [[javascript:alert(1)|Y]]' }))).toEqual(['body'])
    expect(paths(validateFields(fields, { items: ['[[/a|A]]', '[[data:text/html,x|B]]'] }))).toEqual(['items.1'])
  })
})

const components: Record<string, ComponentDocument> = deepFreeze({
  cmp_hero: { name: 'Hero', blockType: 'hero', props: { title: 'Baza' }, exposed: ['title', 'cta', 'customClass', 'variant', 'metaNote'] },
  cmp_text: { name: 'Tekst', blockType: 'text', props: { heading: 'H' }, exposed: ['heading'] },
})
const noHero = (): PageDocument => {
  const p = makePage()
  return deepFreeze({ ...p, blocks: p.blocks.filter(b => b.id !== 'h1') })
}
const withG = (overrides: Record<string, unknown> = {}, ref = 'cmp_text'): PageDocument => {
  const p = noHero()
  return deepFreeze({ ...p, blocks: [...p.blocks.slice(0, 1), { id: 'g1', type: 'global', ref, props: {}, overrides }, ...p.blocks.slice(1)] })
}

describe('walidacja instancji komponentów (components podane)', () => {
  it('poprawna instancja', () => {
    expect(validatePage(withG({ heading: 'X' }), schema, components)).toEqual([])
  })
  it('ref musi być id istniejącego komponentu (slug odrzucony)', () => {
    expect(paths(validatePage(withG({}, 'tekst'), schema, components))).toEqual(['blocks.1.ref'])
    expect(validatePage(withG({}, 'tekst'), schema)).toEqual([])
  })
  it('overrides tylko z exposed i wg pól typu bloku', () => {
    expect(paths(validatePage(withG({ body: 'x' }), schema, components))).toEqual(['blocks.1.overrides.body'])
    expect(paths(validatePage(withG({ heading: 5 }), schema, components))).toEqual(['blocks.1.overrides.heading'])
    const hero = withG({ cta: { label: 'x', href: 'javascript:alert(1)' } }, 'cmp_hero')
    expect(paths(validatePage(hero, schema, components))).toEqual(['blocks.1.overrides.cta.href'])
  })
  it('validateEntityData przekazuje components (page i pattern)', () => {
    expect(paths(validateEntityData('page', withG({}, 'nope'), schema, { slug: '', components }))).toEqual(['blocks.1.ref'])
    const pattern = { name: 'P', blocks: [{ id: 'g', type: 'global', ref: 'nope', props: {} }] }
    expect(paths(validateEntityData('pattern', pattern, schema, { slug: 'p', components }))).toEqual(['blocks.0.ref'])
  })
  it('instancja liczy się do maxPerPage typu komponentu', () => {
    const p = makePage()
    const doc = { ...p, blocks: [...p.blocks, { id: 'g', type: 'global', ref: 'cmp_hero', props: {} }] }
    expect(paths(validatePage(doc, schema, components))).toEqual(['blocks.5'])
  })
})

describe('requiredPermissions: instancje komponentów', () => {
  const req = (before: unknown, after: unknown, withComponents = true) =>
    requiredPermissions('page', before, after, schema, withComponents ? { components } : undefined)

  it('overrides oceniane jak props (poziomy, tab seo)', () => {
    const base = withG({}, 'cmp_hero')
    expect(req(base, withG({ title: 'X' }, 'cmp_hero'))).toEqual(['CONTENT_EDIT'])
    expect(req(base, withG({ variant: 'light' }, 'cmp_hero'))).toEqual(['CONTENT_EDIT', 'MODE_ADVANCED'])
    expect(req(base, withG({ customClass: 'x' }, 'cmp_hero'))).toEqual(['CONTENT_EDIT', 'MODE_DEVELOPER'])
    expect(req(base, withG({ metaNote: 'x' }, 'cmp_hero'))).toEqual(['CONTENT_EDIT', 'SEO_EDIT'])
    expect(req(base, withG({ unknown: 'x' }, 'cmp_hero'))).toEqual(['CONTENT_EDIT', 'MODE_DEVELOPER'])
  })
  it('zmiana ref → CONTENT_EDIT + MODE_ADVANCED; bez components → MODE_DEVELOPER', () => {
    expect(req(withG({}, 'cmp_text'), withG({}, 'cmp_hero'))).toEqual(['CONTENT_EDIT', 'MODE_ADVANCED'])
    expect(req(withG({}, 'cmp_text'), withG({}, 'cmp_hero'), false)).toEqual(['CONTENT_EDIT', 'MODE_ADVANCED', 'MODE_DEVELOPER'])
    expect(req(withG({}), withG({ heading: 'x' }), false)).toEqual(['CONTENT_EDIT', 'MODE_DEVELOPER'])
  })
  it('dodanie instancji z overrides → prawa tych pól', () => {
    expect(req(noHero(), withG({ customClass: 'x' }, 'cmp_hero'))).toEqual(['CONTENT_EDIT', 'MODE_DEVELOPER'])
    expect(req(noHero(), withG({ heading: 'x' }))).toEqual(['CONTENT_EDIT'])
    expect(req(noHero(), withG({}))).toEqual(['CONTENT_EDIT'])
    expect(req(noHero(), withG({ heading: 'x' }), false)).toEqual(['CONTENT_EDIT', 'MODE_DEVELOPER'])
    expect(req(noHero(), withG({}, 'nope'))).toEqual(['CONTENT_EDIT', 'MODE_DEVELOPER'])
  })
  it('usunięcie instancji: prawa pól z overrides i removable typu komponentu', () => {
    expect(req(withG({ heading: 'x' }), noHero())).toEqual(['CONTENT_EDIT'])
    expect(req(withG({ variant: 'light' }, 'cmp_hero'), noHero())).toEqual(['CONTENT_EDIT', 'MODE_ADVANCED', 'MODE_DEVELOPER'])
  })
})

describe('requiredPermissions: usuwanie, zmiana typu i restrictions', () => {
  const page = makePage()
  const req = (after: unknown, before: unknown = page) => requiredPermissions('page', before, after, schema, { components })
  const replace = (doc: PageDocument, id: string, block: BlockInstance): PageDocument => ({ ...doc, blocks: doc.blocks.map(b => (b.id === id ? block : b)) })

  it('usunięcie bloku removable:false → MODE_DEVELOPER', () => {
    expect(req({ ...page, blocks: page.blocks.slice(1) })).toEqual(['CONTENT_EDIT', 'MODE_DEVELOPER'])
  })
  it('usunięcie bloku z treścią advanced wymaga MODE_ADVANCED', () => {
    const before = replace(page, 'c1', { id: 'c1', type: 'cards', props: { items: [{ _id: 'i1', title: 'K', note: 'adv' }] } })
    expect(req({ ...page, blocks: page.blocks.filter(b => b.id !== 'c1') }, before)).toEqual(['CONTENT_EDIT', 'MODE_ADVANCED'])
  })
  it('zamiana bloku na instancję pod tym samym id: prawa starego bloku', () => {
    const dev = replace(page, 'h1', { ...page.blocks[0]!, props: { title: 'x', customClass: 'dev' } })
    const after = replace(dev, 'h1', { id: 'h1', type: 'global', ref: 'cmp_hero', props: {}, overrides: {} })
    expect(req(after, dev)).toEqual(['CONTENT_EDIT', 'MODE_DEVELOPER'])
    const t = replace(page, 't1', { id: 't1', type: 'global', ref: 'cmp_text', props: {} })
    expect(req(t)).toEqual(['CONTENT_EDIT'])
  })
  it('przesunięcie bloku movable:false → MODE_DEVELOPER', () => {
    const [h, t1, ...rest] = page.blocks
    expect(req({ ...page, blocks: [t1!, h!, ...rest] })).toEqual(['CONTENT_EDIT', 'MODE_DEVELOPER'])
  })
  it('ukrycie bloku hideable:false (hidden albo visibility) → MODE_DEVELOPER', () => {
    expect(req(replace(page, 'h1', { ...page.blocks[0]!, hidden: true }))).toEqual(['CONTENT_EDIT', 'MODE_DEVELOPER'])
    expect(req(replace(page, 'h1', { ...page.blocks[0]!, visibility: { desktop: true, mobile: false } }))).toEqual(['CONTENT_EDIT', 'MODE_DEVELOPER'])
    const hidden = replace(page, 'h1', { ...page.blocks[0]!, hidden: true })
    expect(req(page, hidden)).toEqual(['CONTENT_EDIT'])
  })
  it('przekroczenie maxPerPage → MODE_DEVELOPER (także przez instancję)', () => {
    expect(req({ ...page, blocks: [...page.blocks, { id: 'h2', type: 'hero', props: { title: 'Cześć', variant: 'dark' } }] })).toEqual(['CONTENT_EDIT', 'MODE_DEVELOPER'])
    expect(req({ ...page, blocks: [...page.blocks, { id: 'g', type: 'global', ref: 'cmp_hero', props: {} }] })).toEqual(['CONTENT_EDIT', 'MODE_DEVELOPER'])
  })
})
