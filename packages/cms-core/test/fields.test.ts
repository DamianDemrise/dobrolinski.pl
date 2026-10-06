// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { CmsError, defineBlock, getAtPath, getFieldAtPath, getFieldChain, isSafeUrl, setAtPath, validateBlock, validateFields } from '../src/index'
import type { FieldDef } from '../src/index'
import { deepFreeze, schema } from './fixtures'

const hero = schema.blocks.hero!
const text = schema.blocks.text!
const cards = schema.blocks.cards!
const paths = (issues: { path: string }[]) => issues.map(i => i.path)

describe('defineBlock', () => {
  it('uzupełnia domyślne restrictions', () => {
    const def = defineBlock({ type: 'x', label: 'X', region: 'main', fields: [], defaults: {}, restrictions: { removable: false } })
    expect(def.restrictions).toEqual({ movable: true, removable: false, hideable: true, duplicable: true })
    expect(defineBlock({ type: 'y', label: 'Y', region: 'main', fields: [], defaults: {} }).restrictions.movable).toBe(true)
  })
})

describe('isSafeUrl', () => {
  it.each(['https://x.pl', 'http://x.pl/a?b=1#c', 'mailto:a@b.pl', 'tel:+48123456789', '/oferta', '/', '#kontakt', 'HTTPS://X.PL'])('akceptuje %s', (u) => {
    expect(isSafeUrl(u)).toBe(true)
  })
  it.each([
    'javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'JavaScript:alert(1)', ' javascript:alert(1)', '\tjavascript:alert(1)',
    'java\nscript:alert(1)', 'data:text/html;base64,xx', 'vbscript:msgbox', '//evil.com', '/\\evil.com', '\\\\evil.com',
    'https:evil.com', 'https://', 'mailto:', 'ftp://x.pl', 'oferta', '', ' /a', '/a ', 'tel:12 34',
  ])('odrzuca %j', (u) => {
    expect(isSafeUrl(u)).toBe(false)
  })
})

describe('validateFields', () => {
  it('poprawne props → brak błędów', () => {
    const props = deepFreeze({
      title: 'Hej', lead: 'a\nb', cta: { label: 'Go', href: '/x' }, image: { src: '/img/a.webp', alt: 'A', width: 10, height: 5, mediaId: 'm1' },
      variant: 'light', accent: 'gold', customClass: 'x', metaNote: 'n',
    })
    expect(validateBlock(hero, props)).toEqual([])
  })
  it('nieznane klucze są błędem', () => {
    expect(paths(validateBlock(hero, { title: 'a', foo: 1 }))).toEqual(['foo'])
    expect(paths(validateBlock(hero, { title: 'a', cta: { label: 'a', href: '/', target: '_blank' } }))).toEqual(['cta.target'])
    expect(paths(validateBlock(hero, { title: 'a', image: { src: '/a', alt: '', onerror: 'x' } }))).toEqual(['image.onerror'])
  })
  it('required i maxLength', () => {
    expect(paths(validateBlock(hero, {}))).toEqual(['title'])
    expect(paths(validateBlock(hero, { title: '   ' }))).toEqual(['title'])
    expect(paths(validateBlock(hero, { title: 'x'.repeat(21) }))).toEqual(['title'])
    expect(validateBlock(hero, { title: 'x'.repeat(20) })).toEqual([])
  })
  it('znaki sterujące: text bez \\n, textarea z \\n, ale bez innych', () => {
    expect(paths(validateBlock(hero, { title: 'a\nb' }))).toEqual(['title'])
    expect(paths(validateBlock(hero, { title: 'a', lead: 'a\u0000' }))).toEqual(['lead'])
    expect(paths(validateBlock(hero, { title: 'a', lead: 'a\tb' }))).toEqual(['lead'])
    expect(paths(validateBlock(hero, { title: 'a', lead: 'a\u007f' }))).toEqual(['lead'])
    expect(validateBlock(hero, { title: 'a', lead: 'a\nb' })).toEqual([])
    expect(paths(validateBlock(hero, { title: 'a', cta: { label: 'a\nb', href: '/' } }))).toEqual(['cta.label'])
  })
  it('typy wartości', () => {
    expect(paths(validateBlock(hero, { title: 5 }))).toEqual(['title'])
    expect(paths(validateBlock(text, { wide: 'tak' }))).toEqual(['wide'])
    expect(paths(validateBlock(text, { size: '3' }))).toEqual(['size'])
    expect(paths(validateBlock(text, { size: Number.NaN }))).toEqual(['size'])
    expect(paths(validateBlock(hero, { title: 'a', cta: 'https://x.pl' }))).toEqual(['cta'])
  })
  it('link.href przez isSafeUrl', () => {
    expect(paths(validateBlock(hero, { title: 'a', cta: { label: 'x', href: 'javascript:alert(1)' } }))).toEqual(['cta.href'])
    expect(paths(validateBlock(hero, { title: 'a', cta: { label: 'x', href: '//evil.com' } }))).toEqual(['cta.href'])
    expect(validateBlock(hero, { title: 'a', cta: { label: 'x', href: '' } })).toEqual([])
    const req: FieldDef[] = [{ key: 'l', label: 'L', type: 'link', required: true }]
    expect(paths(validateFields(req, { l: { label: 'x', href: '' } }))).toEqual(['l.href'])
  })
  it('image.src tylko /… albo https://', () => {
    const bad = ['http://x.pl/a.jpg', 'data:image/png;base64,xx', '//x.pl/a.jpg', 'a.jpg', 'javascript:x']
    for (const src of bad) expect(paths(validateBlock(hero, { title: 'a', image: { src, alt: '' } }))).toEqual(['image.src'])
    expect(validateBlock(hero, { title: 'a', image: { src: 'https://cdn.x.pl/a.jpg', alt: '' } })).toEqual([])
    expect(paths(validateBlock(hero, { title: 'a', image: { src: '/a', alt: '', width: -1 } }))).toEqual(['image.width'])
  })
  it('select i tokenColor tylko z dozwolonych', () => {
    expect(paths(validateBlock(hero, { title: 'a', variant: 'neon' }))).toEqual(['variant'])
    expect(paths(validateBlock(hero, { title: 'a', accent: '#ff0000' }))).toEqual(['accent'])
    expect(paths(validateBlock(hero, { title: 'a', accent: 'red' }))).toEqual(['accent'])
  })
  it('number min/max', () => {
    expect(paths(validateBlock(text, { size: 0 }))).toEqual(['size'])
    expect(paths(validateBlock(text, { size: 6 }))).toEqual(['size'])
    expect(validateBlock(text, { size: 5 })).toEqual([])
  })
  it('lines: maxItems, maxLength, bez \\n', () => {
    expect(validateBlock(text, { lines: ['a', 'b'] })).toEqual([])
    expect(paths(validateBlock(text, { lines: ['a', 'b', 'c'] }))).toEqual(['lines'])
    expect(paths(validateBlock(text, { lines: ['x'.repeat(11)] }))).toEqual(['lines.0'])
    expect(paths(validateBlock(text, { lines: ['a\nb'] }))).toEqual(['lines.0'])
    expect(paths(validateBlock(text, { lines: 'a' }))).toEqual(['lines'])
  })
  it('responsive: wartości per urządzenie', () => {
    expect(validateBlock(text, { align: { desktop: 'left', mobile: 'center' } })).toEqual([])
    expect(paths(validateBlock(text, { align: { desktop: 'left', mobile: 'right' } }))).toEqual(['align.mobile'])
    expect(paths(validateBlock(hero, { title: { desktop: 'a' } }))).toEqual(['title'])
  })
  it('list: _id, minItems, maxItems, pola elementu', () => {
    expect(validateBlock(cards, { items: [{ _id: 'a', title: 'x' }] })).toEqual([])
    expect(paths(validateBlock(cards, { items: [] }))).toEqual(['items'])
    const four = [1, 2, 3, 4].map(i => ({ _id: `i${i}`, title: 'x' }))
    expect(paths(validateBlock(cards, { items: four }))).toEqual(['items'])
    expect(paths(validateBlock(cards, { items: [{ title: 'x' }] }))).toEqual(['items.0._id'])
    expect(paths(validateBlock(cards, { items: [{ _id: 5, title: 'x' }] }))).toEqual(['items.0._id'])
    expect(paths(validateBlock(cards, { items: [{ _id: 'a' }] }))).toEqual(['items.0.title'])
    expect(paths(validateBlock(cards, { items: [{ _id: 'a', title: 'x', evil: 1 }] }))).toEqual(['items.0.evil'])
    expect(paths(validateBlock(cards, { items: ['x'] }))).toEqual(['items.0'])
  })
  it('group: pola wewnętrzne', () => {
    expect(validateBlock(cards, { items: [{ _id: 'a', title: 'x' }], style: { color: 'gold' } })).toEqual([])
    expect(paths(validateBlock(cards, { items: [{ _id: 'a', title: 'x' }], style: { color: 'ink', x: 1 } }))).toEqual(['style.x', 'style.color'])
  })
  it('path jako prefiks', () => {
    expect(paths(validateBlock(hero, {}, 'blocks.0.props'))).toEqual(['blocks.0.props.title'])
  })
})

describe('ścieżki', () => {
  it('getFieldAtPath / getFieldChain', () => {
    expect(getFieldAtPath(cards.fields, 'items.2.title')?.key).toBe('title')
    expect(getFieldAtPath(cards.fields, 'items')?.key).toBe('items')
    expect(getFieldAtPath(cards.fields, 'items.0')?.key).toBe('items')
    expect(getFieldAtPath(cards.fields, 'items.0._id')?.key).toBe('items')
    expect(getFieldAtPath(cards.fields, 'items.0.link.href')?.key).toBe('link')
    expect(getFieldAtPath(cards.fields, 'style.color')?.key).toBe('color')
    expect(getFieldAtPath(cards.fields, 'nope')).toBeUndefined()
    expect(getFieldAtPath(cards.fields, 'items.x.title')).toBeUndefined()
    expect(getFieldChain(cards.fields, 'style.color')?.map(f => f.key)).toEqual(['style', 'color'])
    expect(getFieldAtPath(text.fields, 'align.mobile')?.key).toBe('align')
  })
  it('getAtPath', () => {
    const o = { a: { b: [{ c: 1 }] } }
    expect(getAtPath(o, 'a.b.0.c')).toBe(1)
    expect(getAtPath(o, 'a.x.y')).toBeUndefined()
    expect(getAtPath(o, '')).toBe(o)
    expect(getAtPath({}, 'toString')).toBeUndefined()
  })
  it('setAtPath jest niemutujące i tworzy pośrednie węzły', () => {
    const o = deepFreeze({ a: { b: [{ c: 1 }, { c: 2 }] }, z: { k: 1 } })
    const n = setAtPath(o, 'a.b.1.c', 3)
    expect(n.a.b[1]!.c).toBe(3)
    expect(o.a.b[1]!.c).toBe(2)
    expect(n.z).toBe(o.z)
    expect(n.a.b[0]).toBe(o.a.b[0])
    expect(setAtPath({}, 'x.0.y', 1)).toEqual({ x: [{ y: 1 }] })
    expect(setAtPath(o, 'z.k', undefined).z).toEqual({})
  })
  it('setAtPath odrzuca __proto__/constructor/prototype', () => {
    for (const p of ['__proto__.x', 'a.constructor', 'prototype']) {
      expect(() => setAtPath({}, p, 1)).toThrow(CmsError)
    }
    try {
      setAtPath({}, '__proto__.polluted', 1)
    }
    catch (e) {
      expect((e as CmsError).code).toBe('invalid_path')
    }
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    expect(() => setAtPath({ a: [1] }, 'a.x', 1)).toThrow(CmsError)
  })
})
