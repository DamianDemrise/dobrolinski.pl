// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  CmsError, duplicateBlock, findBlock, insertBlock, insertPattern, moveBlock, newId, removeBlock,
  setBlockHidden, setBlockVisibility, updateBlockProps,
} from '../src/index'
import type { PageDocument, PatternDocument } from '../src/index'
import { deepFreeze, makePage, schema } from './fixtures'

function code(fn: () => unknown): string | undefined {
  try {
    fn()
  }
  catch (e) {
    expect(e).toBeInstanceOf(CmsError)
    return (e as CmsError).code
  }
  return undefined
}
const ids = (doc: PageDocument) => doc.blocks.map(b => b.id)

describe('newId / findBlock', () => {
  it('generuje unikalne id z prefiksem', () => {
    const set = new Set(Array.from({ length: 500 }, () => newId()))
    expect(set.size).toBe(500)
    expect(newId('x')).toMatch(/^x_[0-9a-v]{10}$/)
    expect(newId('')).toMatch(/^[0-9a-v]{10}$/)
  })
  it('findBlock', () => {
    expect(findBlock(makePage(), 't1')?.type).toBe('text')
    expect(findBlock(makePage(), 'nope')).toBeUndefined()
  })
})

describe('updateBlockProps', () => {
  it('zmienia tylko wskazany blok, nie mutuje', () => {
    const p = makePage()
    const n = updateBlockProps(p, 'c1', 'items.0.title', 'Nowy')
    expect(findBlock(n, 'c1')?.props).toEqual({ items: [{ _id: 'i1', title: 'Nowy' }] })
    expect(findBlock(p, 'c1')?.props).toEqual({ items: [{ _id: 'i1', title: 'K1' }] })
    expect(n.blocks[0]).toBe(p.blocks[0])
  })
  it('global → overrides', () => {
    const p = deepFreeze({ ...makePage(), blocks: [{ id: 'g', type: 'global', ref: 'c', props: {} }] })
    expect(updateBlockProps(p, 'g', 'title', 'X').blocks[0]).toEqual({ id: 'g', type: 'global', ref: 'c', props: {}, overrides: { title: 'X' } })
  })
  it('brak bloku → block_not_found', () => {
    expect(code(() => updateBlockProps(makePage(), 'nope', 'a', 1))).toBe('block_not_found')
  })
})

describe('moveBlock', () => {
  it('przesuwa w obrębie obszaru', () => {
    const p = makePage()
    expect(ids(moveBlock(p, 't2', 1, schema))).toEqual(['h1', 't2', 't1', 'c1', 'f1'])
    expect(ids(p)).toEqual(['h1', 't1', 'c1', 't2', 'f1'])
    expect(moveBlock(p, 't1', 1, schema)).toBe(p)
  })
  it('restrictions i regiony', () => {
    const p = makePage()
    expect(code(() => moveBlock(p, 'h1', 2, schema))).toBe('not_movable')
    expect(code(() => moveBlock(p, 't1', 0, schema))).toBe('region_mismatch')
    expect(code(() => moveBlock(p, 't1', 4, schema))).toBe('region_mismatch')
    expect(code(() => moveBlock(p, 'f1', 1, schema))).toBe('region_mismatch')
    expect(code(() => moveBlock(p, 't1', 9, schema))).toBe('invalid_index')
    expect(code(() => moveBlock(p, 't1', -1, schema))).toBe('invalid_index')
    expect(code(() => moveBlock(p, 't1', 1.5, schema))).toBe('invalid_index')
    expect(code(() => moveBlock(p, 'nope', 1, schema))).toBe('block_not_found')
  })
  it('nie przeskakuje bloku o stałej pozycji (ta sama reguła co serwer)', () => {
    const fixedMain = { ...schema, blocks: { ...schema.blocks, text: { ...schema.blocks.text!, restrictions: { ...schema.blocks.text!.restrictions } } } }
    const t1 = { ...fixedMain.blocks.text!, restrictions: { ...fixedMain.blocks.text!.restrictions, movable: true } }
    const s2 = { ...fixedMain, blocks: { ...fixedMain.blocks, text: t1, fixedText: { ...t1, type: 'fixedText', restrictions: { ...t1.restrictions, movable: false } } } }
    const p = { ...makePage(), blocks: [
      { id: 'a', type: 'text', props: {} },
      { id: 'x', type: 'fixedText', props: {} },
      { id: 'b', type: 'text', props: {} },
    ] }
    expect(code(() => moveBlock(p, 'a', 2, s2))).toBe('not_movable')
    expect(code(() => moveBlock(p, 'b', 0, s2))).toBe('not_movable')
  })
  it('blok nieznanego typu → unknown_block_type', () => {
    const p = deepFreeze({ ...makePage(), blocks: [{ id: 'a', type: 'zzz', props: {} }, { id: 'b', type: 'text', props: {} }] })
    expect(code(() => moveBlock(p, 'a', 1, schema))).toBe('unknown_block_type')
  })
})

describe('setBlockHidden / setBlockVisibility', () => {
  it('ukrywa i odkrywa (bez pola hidden:false)', () => {
    const p = makePage()
    const h = setBlockHidden(p, 't1', true, schema)
    expect(findBlock(h, 't1')?.hidden).toBe(true)
    expect(findBlock(p, 't1')?.hidden).toBeUndefined()
    expect('hidden' in findBlock(setBlockHidden(h, 't1', false, schema), 't1')!).toBe(false)
  })
  it('!hideable → not_hideable; odkrycie zawsze wolno', () => {
    const p = makePage()
    expect(code(() => setBlockHidden(p, 'h1', true, schema))).toBe('not_hideable')
    const hidden = deepFreeze({ ...p, blocks: [{ ...p.blocks[0]!, hidden: true }, ...p.blocks.slice(1)] })
    expect(findBlock(setBlockHidden(hidden, 'h1', false, schema), 'h1')?.hidden).toBeUndefined()
  })
  it('widoczność per urządzenie z dziedziczeniem', () => {
    const p = makePage()
    const a = setBlockVisibility(p, 't1', 'mobile', false)
    expect(findBlock(a, 't1')?.visibility).toEqual({ desktop: true, mobile: false })
    const b = setBlockVisibility(a, 't1', 'mobile', undefined)
    expect(findBlock(b, 't1')?.visibility).toBeUndefined()
    const c = setBlockVisibility(p, 't1', 'desktop', false)
    expect(findBlock(c, 't1')?.visibility).toEqual({ desktop: false })
    const d = setBlockVisibility(c, 't1', 'tablet', true)
    expect(findBlock(d, 't1')?.visibility).toEqual({ desktop: false, tablet: true })
    expect(findBlock(setBlockVisibility(p, 't1', 'tablet', true), 't1')?.visibility).toBeUndefined()
  })
})

describe('duplicateBlock', () => {
  it('kopiuje za oryginałem z nowym id i nowymi _id', () => {
    const p = makePage()
    const n = duplicateBlock(p, 'c1', schema)
    expect(n.blocks).toHaveLength(6)
    const copy = n.blocks[3]!
    expect(copy.id).not.toBe('c1')
    expect(copy.type).toBe('cards')
    const items = copy.props.items as { _id: string, title: string }[]
    expect(items[0]!.title).toBe('K1')
    expect(items[0]!._id).not.toBe('i1')
    expect(p.blocks).toHaveLength(5)
  })
  it('!duplicable i maxPerPage', () => {
    const p = makePage()
    expect(code(() => duplicateBlock(p, 'h1', schema))).toBe('not_duplicable')
    const two = duplicateBlock(p, 'c1', schema)
    expect(code(() => duplicateBlock(two, 'c1', schema))).toBe('max_per_page')
  })
})

describe('removeBlock', () => {
  it('usuwa, a !removable rzuca', () => {
    const p = makePage()
    expect(ids(removeBlock(p, 't1', schema))).toEqual(['h1', 'c1', 't2', 'f1'])
    expect(code(() => removeBlock(p, 'h1', schema))).toBe('not_removable')
    expect(code(() => removeBlock(p, 'x', schema))).toBe('block_not_found')
  })
})

describe('insertBlock', () => {
  const block = deepFreeze({ id: 'n1', type: 'text', props: { heading: 'N' } })
  it('wstawia kopię', () => {
    const n = insertBlock(makePage(), block, 2, schema)
    expect(ids(n)).toEqual(['h1', 't1', 'n1', 'c1', 't2', 'f1'])
    expect(n.blocks[2]).toEqual(block)
    expect(n.blocks[2]).not.toBe(block)
  })
  it('błędy', () => {
    const p = makePage()
    expect(code(() => insertBlock(p, block, 0, schema))).toBe('region_mismatch')
    expect(code(() => insertBlock(p, block, 5, schema))).toBe('region_mismatch')
    expect(code(() => insertBlock(p, block, 6, schema))).toBe('invalid_index')
    expect(code(() => insertBlock(p, { ...block, id: 't1' }, 1, schema))).toBe('duplicate_id')
    expect(code(() => insertBlock(p, { id: 'z', type: 'zzz', props: {} }, 1, schema))).toBe('unknown_block_type')
    expect(code(() => insertBlock(p, { id: 'h2', type: 'hero', props: { title: 'x' } }, 0, schema))).toBe('max_per_page')
    expect(code(() => insertBlock({ ...p, layout: 'doc' }, { id: 'f2', type: 'footerNote', props: {} }, 0, schema))).toBe('region_not_allowed')
    expect(code(() => insertBlock({ ...p, layout: 'nope' }, block, 1, schema))).toBe('unknown_layout')
    expect(code(() => insertBlock(p, { id: 'g', type: 'global', props: {} }, 1, schema))).toBe('unknown_block_type')
  })
  it('blok globalny wolno wstawić wszędzie', () => {
    expect(ids(insertBlock(makePage(), { id: 'g', type: 'global', ref: 'c', props: {} }, 0, schema))[0]).toBe('g')
  })
})

describe('insertPattern', () => {
  const pattern: PatternDocument = deepFreeze({
    name: 'Wzór',
    blocks: [
      { id: 't1', type: 'text', props: { heading: 'P' } },
      { id: 'pc', type: 'cards', props: { items: [{ _id: 'i1', title: 'A', link: { label: 'x', href: '/' } }, { _id: 'i2', title: 'B' }] } },
      { id: 'pg', type: 'global', ref: 'c', props: {}, overrides: { list: [{ _id: 'o1' }] } },
    ],
  })
  it('wstawia kopie z nowymi id i _id; wzorzec niezmieniony', () => {
    const p = makePage()
    const n = insertPattern(p, pattern, 2)
    expect(n.blocks).toHaveLength(8)
    const inserted = n.blocks.slice(2, 5)
    expect(inserted.map(b => b.type)).toEqual(['text', 'cards', 'global'])
    for (const b of inserted) expect(['t1', 'pc', 'pg', ...ids(p)]).not.toContain(b.id)
    expect(new Set(ids(n)).size).toBe(8)
    const items = inserted[1]!.props.items as { _id: string, title: string, link?: unknown }[]
    expect(items.map(i => i.title)).toEqual(['A', 'B'])
    expect(items.map(i => i._id)).not.toContain('i1')
    expect(items[0]!._id).not.toBe(items[1]!._id)
    expect(items[0]!.link).toEqual({ label: 'x', href: '/' })
    expect((inserted[2]!.overrides!.list as { _id: string }[])[0]!._id).not.toBe('o1')
    expect(pattern.blocks[1]!.props.items).toEqual([{ _id: 'i1', title: 'A', link: { label: 'x', href: '/' } }, { _id: 'i2', title: 'B' }])
    // kopia jest niezależna: zmiana kopii nie dotyka wzorca
    items[0]!.title = 'Z'
    expect((pattern.blocks[1]!.props.items as { title: string }[])[0]!.title).toBe('A')
  })
  it('indeks poza zakresem', () => {
    expect(code(() => insertPattern(makePage(), pattern, 99))).toBe('invalid_index')
  })
})
