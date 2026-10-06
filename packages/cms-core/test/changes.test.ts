// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  duplicateBlock, insertBlock, moveBlock, removeBlock, requiredPermissions, setAtPath, setBlockHidden,
  setBlockVisibility, updateBlockProps,
} from '../src/index'
import { makePage, schema } from './fixtures'

const page = makePage()
const req = (after: unknown, before: unknown = page) => requiredPermissions('page', before, after, schema)

describe('requiredPermissions: page', () => {
  it('brak zmian → []', () => {
    expect(req(makePage())).toEqual([])
  })
  it('pole safe → CONTENT_EDIT', () => {
    expect(req(updateBlockProps(page, 't1', 'heading', 'Z'))).toEqual(['CONTENT_EDIT'])
    expect(req(updateBlockProps(page, 'c1', 'items.0.title', 'Z'))).toEqual(['CONTENT_EDIT'])
    expect(req({ ...page, title: 'Nowy' })).toEqual(['CONTENT_EDIT'])
  })
  it('pole advanced → MODE_ADVANCED', () => {
    expect(req(updateBlockProps(page, 'h1', 'variant', 'light'))).toEqual(['CONTENT_EDIT', 'MODE_ADVANCED'])
    expect(req(updateBlockProps(page, 'c1', 'items.0.note', 'x'))).toEqual(['CONTENT_EDIT', 'MODE_ADVANCED'])
    // dziecko grupy advanced dziedziczy poziom
    expect(req(updateBlockProps(page, 'c1', 'style.color', 'gold'))).toEqual(['CONTENT_EDIT', 'MODE_ADVANCED'])
  })
  it('pole developer → MODE_DEVELOPER', () => {
    expect(req(updateBlockProps(page, 'h1', 'customClass', 'x'))).toEqual(['CONTENT_EDIT', 'MODE_DEVELOPER'])
  })
  it('nieznane pole → MODE_DEVELOPER', () => {
    expect(req(updateBlockProps(page, 't1', 'evil', 'x'))).toEqual(['CONTENT_EDIT', 'MODE_DEVELOPER'])
  })
  it('SEO strony i pola tab:seo → SEO_EDIT', () => {
    expect(req({ ...page, seo: { ...page.seo, title: 'Nowy' } })).toEqual(['SEO_EDIT'])
    expect(req({ ...page, seo: { ...page.seo, noindex: true } })).toEqual(['SEO_EDIT', 'MODE_ADVANCED'])
    expect(req(updateBlockProps(page, 'h1', 'metaNote', 'x'))).toEqual(['CONTENT_EDIT', 'SEO_EDIT'])
  })
  it('struktura: kolejność, ukrycie, widoczność, dodanie, usunięcie → CONTENT_EDIT', () => {
    expect(req(moveBlock(page, 't2', 1, schema))).toEqual(['CONTENT_EDIT'])
    expect(req(setBlockHidden(page, 't1', true, schema))).toEqual(['CONTENT_EDIT'])
    expect(req(setBlockVisibility(page, 't1', 'mobile', false))).toEqual(['CONTENT_EDIT'])
    expect(req(removeBlock(page, 't1', schema))).toEqual(['CONTENT_EDIT'])
    expect(req(insertBlock(page, { id: 'n', type: 'text', props: { heading: 'x' } }, 1, schema))).toEqual(['CONTENT_EDIT'])
    expect(req(duplicateBlock(page, 'c1', schema))).toEqual(['CONTENT_EDIT'])
    expect(req(insertBlock(page, { id: 'g', type: 'global', ref: 'c', props: {} }, 1, schema))).toEqual(['CONTENT_EDIT'])
  })
  it('dodany blok z wartością advanced różną od domyślnej → MODE_ADVANCED', () => {
    const noHero = removeBlockUnsafe(page, 'h1')
    const added = { ...noHero, blocks: [{ id: 'h9', type: 'hero', props: { title: 'x', variant: 'light' } }, ...noHero.blocks] }
    expect(req(added, noHero)).toEqual(['CONTENT_EDIT', 'MODE_ADVANCED'])
    const addedDefault = { ...noHero, blocks: [{ id: 'h9', type: 'hero', props: { title: 'x', variant: 'dark' } }, ...noHero.blocks] }
    expect(req(addedDefault, noHero)).toEqual(['CONTENT_EDIT'])
    const addedDev = { ...noHero, blocks: [{ id: 'h9', type: 'hero', props: { title: 'x', customClass: 'z' } }, ...noHero.blocks] }
    expect(req(addedDev, noHero)).toEqual(['CONTENT_EDIT', 'MODE_DEVELOPER'])
    const unknownType = { ...page, blocks: [...page.blocks, { id: 'z', type: 'zzz', props: {} }] }
    expect(req(unknownType)).toEqual(['CONTENT_EDIT', 'MODE_DEVELOPER'])
  })
  it('overrides instancji globalnej bez components → MODE_DEVELOPER (wcześniej CONTENT_EDIT: niebezpieczne)', () => {
    const withG = { ...page, blocks: [...page.blocks, { id: 'g', type: 'global', ref: 'c', props: {} }] }
    expect(req(updateBlockProps(withG, 'g', 'title', 'x'), withG)).toEqual(['CONTENT_EDIT', 'MODE_DEVELOPER'])
  })
  it('slug i layout → MODE_DEVELOPER; nieznany klucz → MODE_DEVELOPER', () => {
    expect(req({ ...page, slug: 'nowy' })).toEqual(['MODE_DEVELOPER'])
    expect(req({ ...page, layout: 'doc' })).toEqual(['MODE_DEVELOPER'])
    expect(req({ ...page, extra: 1 })).toEqual(['MODE_DEVELOPER'])
    expect(req(setAtPath(page, 'blocks.1.extra', 1))).toEqual(['CONTENT_EDIT', 'MODE_DEVELOPER'])
  })
  it('kolejność uprawnień jak w PERMISSIONS', () => {
    const n = { ...updateBlockProps(page, 'h1', 'customClass', 'x'), seo: { ...page.seo, noindex: true } }
    expect(req(n)).toEqual(['CONTENT_EDIT', 'SEO_EDIT', 'MODE_ADVANCED', 'MODE_DEVELOPER'])
  })
})

function removeBlockUnsafe(doc: typeof page, id: string) {
  return { ...doc, blocks: doc.blocks.filter(b => b.id !== id) }
}

describe('requiredPermissions: inne rodzaje', () => {
  it('global wg definicji (ctx.slug lub dopasowanie)', () => {
    expect(requiredPermissions('global', { phone: '1' }, { phone: '2' }, schema, { slug: 'site' })).toEqual(['CONTENT_EDIT'])
    expect(requiredPermissions('global', { phone: '1' }, { phone: '2' }, schema)).toEqual(['CONTENT_EDIT'])
    expect(requiredPermissions('global', {}, { analyticsId: 'G-1' }, schema, { slug: 'site' })).toEqual(['CONTENT_EDIT', 'MODE_DEVELOPER'])
    expect(requiredPermissions('global', {}, { links: [{ _id: 'a', link: { label: 'x', href: '/' } }] }, schema)).toEqual(['CONTENT_EDIT'])
    expect(requiredPermissions('global', {}, { x: 1 }, schema, { slug: 'nope' })).toEqual(['CONTENT_EDIT', 'MODE_DEVELOPER'])
    expect(requiredPermissions('global', {}, { x: 1 }, schema)).toEqual(['CONTENT_EDIT', 'MODE_DEVELOPER'])
    expect(requiredPermissions('global', { phone: '1' }, { phone: '1' }, schema)).toEqual([])
  })
  it('tokens, component, pattern', () => {
    expect(requiredPermissions('tokens', { colors: {} }, { colors: { a: { value: 'red', label: '' } } }, schema)).toEqual(['DESIGN_EDIT'])
    expect(requiredPermissions('component', { name: 'a' }, { name: 'b' }, schema)).toEqual(['COMPONENT_EDIT'])
    expect(requiredPermissions('pattern', { name: 'a' }, { name: 'b' }, schema)).toEqual(['COMPONENT_EDIT'])
    expect(requiredPermissions('tokens', { a: 1 }, { a: 1 }, schema)).toEqual([])
  })
})
