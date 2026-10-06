/** Formularz tokenów (Design): wiersze ↔ dokument i walidacja regułami rdzenia. */
import type { PublishedSite } from '@demrise/cms-core'
import { tokensToCss, validateEntityData } from '@demrise/cms-core'
import { describe, expect, it } from 'vitest'
import { siteSchema } from '../../cms/schema'
import published from '../../content/published.json'
import { cssVarFor, newTokenRow, rowsToTokens, tokensToRows, validateTokenRows } from '../../app/admin/tokens-form'

const tokens = (published as unknown as PublishedSite).tokens

describe('tokens-form', () => {
  it('opublikowane tokeny: wiersze → dokument bez strat i bez błędów', () => {
    const rows = tokensToRows(tokens)
    expect(rowsToTokens(rows)).toEqual(tokens)
    expect(validateTokenRows(rows)).toEqual([])
    expect(validateEntityData('tokens', rowsToTokens(rows), siteSchema, { slug: 'tokens' })).toEqual([])
  })

  it('błędy nazwy, wartości, duplikatu i opisu', () => {
    const rows = tokensToRows(tokens)
    const bad = newTokenRow()
    Object.assign(bad, { name: 'zła nazwa', value: 'red; } body { x', label: 'ok' })
    const dup = { ...newTokenRow(), name: 'base', value: '#000', label: 'x' }
    const empty = { ...newTokenRow(), name: 'new-one', value: '  ', label: 'a\u0007' }
    rows.colors.push(bad, dup, empty)
    const issues = validateTokenRows(rows)
    const of = (key: string) => issues.filter(i => i.key === key).map(i => i.field).sort()
    expect(of(bad.key)).toEqual(['name', 'value'])
    expect(of(dup.key)).toEqual(['name'])
    expect(of(empty.key)).toEqual(['label', 'value'])
    // Każdy dokument, który formularz uznaje za poprawny, przechodzi też walidację rdzenia (i odwrotnie tu: jest błąd).
    expect(validateEntityData('tokens', rowsToTokens(rows), siteSchema, { slug: 'tokens' }).length).toBeGreaterThan(0)
  })

  it('wstrzyknięcie CSS jest odrzucane (wartość nie wychodzi poza deklarację)', () => {
    for (const value of ['red;}', 'a{b', '</style>', 'url(x) /* c */', 'x\\y']) {
      const rows = tokensToRows(tokens)
      rows.colors[0]!.value = value
      expect(validateTokenRows(rows).some(i => i.field === 'value')).toBe(true)
    }
  })

  it('tokenu używanego w tokens.css nie można usunąć ani przemianować', () => {
    expect(cssVarFor('colors', 'ink-primary')).toBe('--ink-primary')
    expect(cssVarFor('colors', 'ink-secondary-mobile')).toBe('--ink-secondary @media (max-width: 640px)')
    expect(cssVarFor('colors', 'base')).toBeNull()
    const rows = tokensToRows(tokens)
    rows.colors = rows.colors.filter(r => r.name !== 'ink-primary')
    expect(validateTokenRows(rows).some(i => i.key === '' && i.message.includes('ink-primary'))).toBe(true)
    const renamed = tokensToRows(tokens)
    renamed.typography.find(r => r.name === 'body')!.name = 'body-new'
    expect(validateTokenRows(renamed).some(i => i.message.includes('„body”'))).toBe(true)
  })

  it('nowy poprawny token: zapis i zmienna CSS w rdzeniu', () => {
    const rows = tokensToRows(tokens)
    rows.radius.push({ ...newTokenRow(), name: 'card', value: '6px', label: 'Karta' })
    expect(validateTokenRows(rows)).toEqual([])
    expect(tokensToCss(rowsToTokens(rows))).toContain('--radius-card: 6px;')
  })
})
