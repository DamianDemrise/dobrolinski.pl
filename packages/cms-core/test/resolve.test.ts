// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { CmsError, resolveBlock, resolveBlocks, resolveResponsive, setResponsive, visibilityClasses } from '../src/index'
import type { ComponentDocument } from '../src/index'
import { deepFreeze } from './fixtures'

const components: Record<string, ComponentDocument> = deepFreeze({
  cta: { name: 'CTA', blockType: 'hero', props: { title: 'Bazowy', lead: 'L', variant: 'dark' }, exposed: ['title'] },
})

describe('resolveBlock', () => {
  it('zwykły blok', () => {
    const b = deepFreeze({ id: 'a', type: 'text', props: { heading: 'x' }, visibility: { desktop: true, mobile: false } })
    expect(resolveBlock(b, components)).toEqual({ id: 'a', type: 'text', props: { heading: 'x' }, hidden: false, visibility: { desktop: true, mobile: false } })
  })
  it('global: tylko exposed nadpisania', () => {
    const b = deepFreeze({ id: 'g', type: 'global', ref: 'cta', props: {}, hidden: true, overrides: { title: 'Nowy', lead: 'HACK', variant: 'light' } })
    const r = resolveBlock(b, components)
    expect(r).toEqual({ id: 'g', type: 'hero', props: { title: 'Nowy', lead: 'L', variant: 'dark' }, hidden: true, visibility: undefined, globalRef: 'cta' })
    expect(components.cta!.props.title).toBe('Bazowy')
  })
  it('global bez overrides = props komponentu', () => {
    expect(resolveBlock({ id: 'g', type: 'global', ref: 'cta', props: {} }, components).props).toEqual(components.cta!.props)
  })
  it('brak komponentu → missing_component', () => {
    for (const ref of ['nope', undefined, 'toString']) {
      try {
        resolveBlock({ id: 'g', type: 'global', ref, props: {} }, components)
        expect.unreachable()
      }
      catch (e) {
        expect(e).toBeInstanceOf(CmsError)
        expect((e as CmsError).code).toBe('missing_component')
      }
    }
  })
  it('resolveBlocks', () => {
    expect(resolveBlocks([{ id: 'a', type: 'text', props: {} }, { id: 'g', type: 'global', ref: 'cta', props: {} }], components).map(b => b.type)).toEqual(['text', 'hero'])
  })
})

describe('responsive', () => {
  it('resolveResponsive dziedziczy mobile → tablet → desktop', () => {
    expect(resolveResponsive({ desktop: 1 }, 'mobile')).toBe(1)
    expect(resolveResponsive({ desktop: 1, tablet: 2 }, 'mobile')).toBe(2)
    expect(resolveResponsive({ desktop: 1, tablet: 2, mobile: 3 }, 'mobile')).toBe(3)
    expect(resolveResponsive({ desktop: 1, mobile: 3 }, 'tablet')).toBe(1)
    expect(resolveResponsive({ desktop: 1, tablet: 2 }, 'desktop')).toBe(1)
    expect(resolveResponsive(5, 'mobile')).toBe(5)
    expect(resolveResponsive({ label: 'x', href: '/' }, 'mobile')).toEqual({ label: 'x', href: '/' })
  })
  it('setResponsive nie tworzy zbędnych nadpisań', () => {
    expect(setResponsive(1, 'mobile', 1)).toEqual({ desktop: 1 })
    expect(setResponsive(1, 'mobile', 2)).toEqual({ desktop: 1, mobile: 2 })
    expect(setResponsive({ desktop: 1, tablet: 2 }, 'mobile', 2)).toEqual({ desktop: 1, tablet: 2 })
    expect(setResponsive({ desktop: 1, mobile: 2 }, 'mobile', undefined)).toEqual({ desktop: 1 })
    expect(setResponsive({ desktop: 1, tablet: 2 }, 'desktop', 2)).toEqual({ desktop: 2 })
    expect(setResponsive({ desktop: 1, tablet: 2, mobile: 2 }, 'tablet', undefined)).toEqual({ desktop: 1, mobile: 2 })
    expect(setResponsive({ desktop: { a: 1 } }, 'tablet', { a: 1 })).toEqual({ desktop: { a: 1 } })
    expect(setResponsive(undefined, 'desktop', 'x')).toEqual({ desktop: 'x' })
  })
  it('setResponsive nie mutuje', () => {
    const v = deepFreeze({ desktop: 1, tablet: 2 })
    setResponsive(v, 'mobile', 3)
    expect(v).toEqual({ desktop: 1, tablet: 2 })
  })
  it('visibilityClasses', () => {
    expect(visibilityClasses()).toEqual([])
    expect(visibilityClasses({ desktop: true })).toEqual([])
    expect(visibilityClasses({ desktop: true, mobile: false })).toEqual(['cms-hide-mobile'])
    expect(visibilityClasses({ desktop: false, mobile: true })).toEqual(['cms-hide-desktop', 'cms-hide-tablet'])
    expect(visibilityClasses({ desktop: true, tablet: false })).toEqual(['cms-hide-tablet', 'cms-hide-mobile'])
  })
})
