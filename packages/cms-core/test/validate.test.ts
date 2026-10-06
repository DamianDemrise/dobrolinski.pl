// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { validateEntityData, validatePage } from '../src/index'
import { makePage, schema, seo } from './fixtures'

const paths = (issues: { path: string }[]) => issues.map(i => i.path)

describe('validatePage', () => {
  it('poprawna strona', () => {
    expect(validatePage(makePage(), schema)).toEqual([])
  })
  it('nieznany typ, nieznany layout, region spoza layoutu', () => {
    const p = makePage()
    expect(paths(validatePage({ ...p, blocks: [{ id: 'x', type: 'nope', props: {} }] }, schema))).toEqual(['blocks.0.type'])
    expect(paths(validatePage({ ...p, layout: 'nope' }, schema))).toContain('layout')
    expect(paths(validatePage({ ...p, layout: 'doc', blocks: [p.blocks[0]!] }, schema))).toEqual(['blocks.0.type'])
  })
  it('maxPerPage i unikalne id', () => {
    const p = makePage()
    const h = p.blocks[0]!
    expect(paths(validatePage({ ...p, blocks: [h, { ...h, id: 'h2' }] }, schema))).toEqual(['blocks.1'])
    expect(paths(validatePage({ ...p, blocks: [h, { id: 'h1', type: 'text', props: {} }] }, schema))).toEqual(['blocks.1.id'])
  })
  it('props wg definicji, seo wg seoFields, nieznane klucze bloku i strony', () => {
    const p = makePage()
    expect(paths(validatePage({ ...p, blocks: [{ id: 'h', type: 'hero', props: { title: 'a', cta: { label: 'x', href: 'javascript:1' } } }] }, schema))).toEqual(['blocks.0.props.cta.href'])
    expect(paths(validatePage({ ...p, seo: { ...seo, title: 'x'.repeat(71) } }, schema))).toEqual(['seo.title'])
    expect(paths(validatePage({ ...p, seo: { ...seo, extra: 1 } }, schema))).toEqual(['seo.extra'])
    expect(paths(validatePage({ ...p, blocks: [{ id: 'h', type: 'hero', props: { title: 'a' }, html: '<b>' }] }, schema))).toEqual(['blocks.0.html'])
    expect(paths(validatePage({ ...p, extra: 1 }, schema))).toEqual(['extra'])
  })
  it('blok globalny, visibility, hidden, slug', () => {
    const p = makePage()
    expect(validatePage({ ...p, blocks: [{ id: 'g', type: 'global', ref: 'c1', props: {}, overrides: { title: 'x' } }] }, schema)).toEqual([])
    expect(paths(validatePage({ ...p, blocks: [{ id: 'g', type: 'global', props: {} }] }, schema))).toEqual(['blocks.0.ref'])
    expect(paths(validatePage({ ...p, blocks: [{ id: 't', type: 'text', props: {}, visibility: { desktop: 'yes' } }] }, schema))).toEqual(['blocks.0.visibility'])
    expect(paths(validatePage({ ...p, blocks: [{ id: 't', type: 'text', props: {}, hidden: 1 }] }, schema))).toEqual(['blocks.0.hidden'])
    expect(paths(validatePage({ ...p, blocks: [{ id: 't', type: 'text', props: {}, ref: 'x' }] }, schema))).toEqual(['blocks.0'])
    expect(validatePage({ ...p, slug: 'oferta/warsztaty-ai' }, schema)).toEqual([])
    expect(paths(validatePage({ ...p, slug: '../etc' }, schema))).toEqual(['slug'])
    expect(paths(validatePage({ ...p, slug: 'Oferta' }, schema))).toEqual(['slug'])
  })
})

describe('validateEntityData', () => {
  it('page: slug musi się zgadzać z encją', () => {
    expect(validateEntityData('page', makePage(), schema, { slug: '' })).toEqual([])
    expect(paths(validateEntityData('page', makePage(), schema, { slug: 'inna' }))).toEqual(['slug'])
  })
  it('global wg definicji', () => {
    expect(validateEntityData('global', { phone: '123' }, schema, { slug: 'site' })).toEqual([])
    expect(paths(validateEntityData('global', { x: 1 }, schema, { slug: 'site' }))).toEqual(['x'])
    expect(paths(validateEntityData('global', {}, schema, { slug: 'nope' }))).toEqual([''])
  })
  it('component', () => {
    const ok = { name: 'CTA', blockType: 'hero', props: { title: 'a' }, exposed: ['title'] }
    expect(validateEntityData('component', ok, schema, { slug: 'cta' })).toEqual([])
    expect(paths(validateEntityData('component', { ...ok, exposed: ['nope'] }, schema, { slug: 'cta' }))).toEqual(['exposed.0'])
    expect(paths(validateEntityData('component', { ...ok, blockType: 'global' }, schema, { slug: 'cta' }))).toEqual(['blockType'])
    expect(paths(validateEntityData('component', { ...ok, props: { title: 1 } }, schema, { slug: 'cta' }))).toEqual(['props.title'])
  })
  it('pattern', () => {
    expect(validateEntityData('pattern', { name: 'P', blocks: [{ id: 'a', type: 'text', props: {} }] }, schema, { slug: 'p' })).toEqual([])
    expect(paths(validateEntityData('pattern', { name: 'P', blocks: [{ id: 'a', type: 'nope', props: {} }] }, schema, { slug: 'p' }))).toEqual(['blocks.0.type'])
  })
  it('tokens: nazwy i wartości bez wstrzyknięć CSS', () => {
    const t = { colors: { gold: { value: '#c9a227', label: 'Złoty' } }, typography: {}, spacing: {}, widths: {}, radius: {}, breakpoints: {} }
    expect(validateEntityData('tokens', t, schema, { slug: 'tokens' })).toEqual([])
    const bad = { ...t, colors: { gold: { value: 'red; } body { display:none', label: '' } } }
    expect(paths(validateEntityData('tokens', bad, schema, { slug: 'tokens' }))).toEqual(['colors.gold.value'])
    const badName = { ...t, colors: { 'a b': { value: 'red', label: '' } } }
    expect(paths(validateEntityData('tokens', badName, schema, { slug: 'tokens' }))).toEqual(['colors.a b'])
    expect(paths(validateEntityData('tokens', { ...t, spacing: undefined }, schema, { slug: 'tokens' }))).toEqual(['spacing'])
  })
  it('nie-obiekt', () => {
    expect(paths(validateEntityData('page', null, schema, { slug: '' }))).toEqual([''])
  })
})
