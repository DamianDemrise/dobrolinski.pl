/**
 * Nowy blok z panelu („Dodaj blok”, nowy komponent): props zawsze przechodzą walidację rdzenia.
 */
import type { BlockInstance, FieldDef, PageDocument, PublishedSite } from '@demrise/cms-core'
import { validateBlock } from '@demrise/cms-core'
import { describe, expect, it } from 'vitest'
import { siteSchema } from '../../cms/schema'
import published from '../../content/published.json'
import { emptyItem, emptyProps, emptyValue, newBlockProps } from '../../app/admin/editor/defaults'

const site = published as unknown as PublishedSite
const allBlocks: BlockInstance[] = Object.values(site.pages).flatMap((p: PageDocument) => p.blocks)

/** Wszystkie _id elementów list (rekurencyjnie). */
function listIds(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach(v => listIds(v, out))
  else if (value && typeof value === 'object') {
    const rec = value as Record<string, unknown>
    if (typeof rec._id === 'string') out.push(rec._id)
    Object.values(rec).forEach(v => listIds(v, out))
  }
  return out
}

describe('emptyProps / newBlockProps bez wzoru', () => {
  for (const def of Object.values(siteSchema.blocks)) {
    it(`${def.type}: puste wartości przechodzą validateBlock`, () => {
      const props = newBlockProps(def)
      expect(validateBlock(def, props)).toEqual([])
    })
  }

  it('wartości startowe wg typu pola', () => {
    const f = (field: Partial<FieldDef> & Pick<FieldDef, 'type'>) => ({ key: 'k', label: 'Etykieta', ...field }) as FieldDef
    expect(emptyValue(f({ type: 'text' }))).toBe('')
    expect(emptyValue(f({ type: 'text', required: true }))).toBe('Etykieta')
    expect(emptyValue(f({ type: 'lines' }))).toEqual([''])
    expect(emptyValue(f({ type: 'toggle' }))).toBe(false)
    expect(emptyValue(f({ type: 'select', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] } as never))).toBe('a')
    expect(emptyValue(f({ type: 'image' }))).toBeUndefined()
    expect(emptyValue(f({ type: 'number', min: 3 } as never))).toBe(3)
    const list = emptyValue(f({ type: 'list', itemLabel: 'x', minItems: 2, fields: [{ key: 't', label: 'T', type: 'text' }] } as never)) as { _id: string }[]
    expect(list).toHaveLength(2)
    expect(list[0]!._id).not.toBe(list[1]!._id)
    expect(emptyItem([{ key: 't', label: 'T', type: 'lines' }])).toEqual({ _id: expect.any(String), t: [''] })
    expect(emptyProps([{ key: 'a', label: 'A', type: 'text' }], { a: 'z' })).toEqual({ a: 'z' })
  })
})

describe('newBlockProps ze wzoru', () => {
  const types = [...new Set(allBlocks.filter(b => b.type !== 'global').map(b => b.type))]
  for (const type of types) {
    it(`${type}: kopia istniejącego bloku jest poprawna, z nowymi _id i bez wspólnych referencji`, () => {
      const def = siteSchema.blocks[type]!
      const source = allBlocks.find(b => b.type === type)!
      const props = newBlockProps(def, [allBlocks])
      expect(validateBlock(def, props)).toEqual([])
      const before = listIds(source.props)
      const after = listIds(props)
      expect(after).toHaveLength(before.length)
      for (const id of after) expect(before).not.toContain(id)
      // Głęboka kopia: zmiana kopii nie dotyka źródła.
      const json = JSON.stringify(source.props)
      ;(props as Record<string, unknown>).__touched = true
      expect(JSON.stringify(source.props)).toBe(json)
    })
  }

  it('pierwsze źródło z blokiem tego typu wygrywa (robocza przed opublikowaną)', () => {
    const def = siteSchema.blocks['current-project']!
    const draft: BlockInstance[] = [{ id: 'b1', type: 'current-project', props: { label: 'Robocza', lead: '' } }]
    const pub: BlockInstance[] = [{ id: 'b1', type: 'current-project', props: { label: 'Opublikowana', lead: '' } }]
    expect(newBlockProps(def, [draft, pub]).label).toBe('Robocza')
    expect(newBlockProps(def, [[], pub]).label).toBe('Opublikowana')
    expect(newBlockProps(def, [null, undefined]).label).toBe('')
  })
})
