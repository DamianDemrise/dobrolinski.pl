/**
 * Formularz tokenów (ekran Design): wiersze edycyjne ↔ TokensDocument i walidacja
 * regułami rdzenia (isSafeTokenName, isSafeTokenValue). Bez Vue (tests/admin/tokens-form.test.ts).
 *
 * Tokeny z mapy cms/tokens-css.json trafiają do app/assets/css/tokens.css przy przebudowie strony
 * (scripts/cms-pull.mjs → generateTokensCss). Brak takiego tokenu wywraca generator, więc
 * tych tokenów nie wolno usunąć ani przemianować (tylko zmiana wartości i opisu).
 */
import type { TokenGroup, TokensDocument } from '@demrise/cms-core'
import { emptyTokens, isSafeTokenName, isSafeTokenValue, TOKEN_GROUPS } from '@demrise/cms-core'
import tokensCssMap from '~~/cms/tokens-css.json'

export interface TokenRow {
  /** Stabilny klucz wiersza w UI (nie zmienia się przy zmianie nazwy). */
  key: string
  name: string
  value: string
  label: string
}

export type TokenRows = Record<TokenGroup, TokenRow[]>

export interface TokenIssue {
  group: TokenGroup
  key: string
  field: 'name' | 'value' | 'label'
  message: string
}

export const TOKEN_GROUP_LABELS: Record<TokenGroup, string> = {
  colors: 'Kolory',
  typography: 'Typografia',
  spacing: 'Odstępy',
  widths: 'Szerokości',
  radius: 'Zaokrąglenia',
  breakpoints: 'Breakpointy',
}

/**
 * Zmienna CSS tokenu w tokens.css (null = token informacyjny, nie trafia do CSS strony).
 * Reguła w media query dostaje dopisek, np. '--ink-secondary @media (max-width: 640px)'.
 */
export function cssVarFor(group: TokenGroup, name: string, map: { rules: { media?: string, vars: string[][] }[] } = tokensCssMap): string | null {
  for (const rule of map.rules) {
    for (const [g, n, cssVar] of rule.vars) {
      if (g === group && n === name && cssVar) return rule.media ? `${cssVar} @media ${rule.media}` : cssVar
    }
  }
  return null
}

let seq = 0
const rowKey = () => `r${++seq}`

export function tokensToRows(tokens: TokensDocument | null | undefined): TokenRows {
  const source = tokens ?? emptyTokens()
  const rows = {} as TokenRows
  for (const group of TOKEN_GROUPS) {
    rows[group] = Object.entries(source[group] ?? {}).map(([name, token]) => ({
      key: rowKey(),
      name,
      value: typeof token?.value === 'string' ? token.value : '',
      label: typeof token?.label === 'string' ? token.label : '',
    }))
  }
  return rows
}

export function rowsToTokens(rows: TokenRows): TokensDocument {
  const out = emptyTokens()
  for (const group of TOKEN_GROUPS) {
    for (const row of rows[group] ?? []) out[group][row.name] = { value: row.value, label: row.label }
  }
  return out
}

export const newTokenRow = (): TokenRow => ({ key: rowKey(), name: '', value: '', label: '' })

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001F\u007F]/

/**
 * Błędy formularza. `required` = nazwy tokenów, które muszą istnieć (domyślnie: mapa tokens.css).
 * Dokument z błędami nie jest zapisywany (Worker i tak odrzuciłby go 422).
 */
export function validateTokenRows(rows: TokenRows, map: { rules: { vars: string[][] }[] } = tokensCssMap): TokenIssue[] {
  const issues: TokenIssue[] = []
  for (const group of TOKEN_GROUPS) {
    const seen = new Map<string, string>()
    for (const row of rows[group] ?? []) {
      const add = (field: TokenIssue['field'], message: string) => issues.push({ group, key: row.key, field, message })
      if (!row.name) add('name', 'Podaj nazwę')
      else if (!isSafeTokenName(row.name)) add('name', 'Nazwa: litery, cyfry, „-” i „_”, na początku litera lub cyfra')
      else if (seen.has(row.name)) add('name', 'Taka nazwa już jest w tej grupie')
      seen.set(row.name, row.key)
      if (!isSafeTokenValue(row.value)) add('value', row.value.trim() === '' ? 'Podaj wartość' : 'Niedozwolone znaki: ; { } < > \\ albo /*')
      if (CONTROL.test(row.label)) add('label', 'Niedozwolone znaki sterujące')
    }
    for (const rule of map.rules) {
      for (const [g, name] of rule.vars) {
        if (g === group && name && !seen.has(name)) {
          issues.push({ group, key: '', field: 'name', message: `Brak tokenu „${name}” używanego w CSS strony` })
        }
      }
    }
  }
  return issues
}
