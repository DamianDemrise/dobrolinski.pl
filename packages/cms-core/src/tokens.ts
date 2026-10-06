/** Tokeny projektu → zmienne CSS. Klient wybiera nazwę tokenu, nie HEX. */
import type { TokensDocument, TokenValue } from './types'
import { hasControlChars } from './util'

export const TOKEN_GROUPS = ['colors', 'typography', 'spacing', 'widths', 'radius', 'breakpoints'] as const
export type TokenGroup = typeof TOKEN_GROUPS[number]

/** Grupy emitowane jako zmienne CSS (breakpoints są tylko informacyjne). */
const CSS_PREFIX: Partial<Record<TokenGroup, string>> = {
  colors: 'color',
  typography: 'type',
  spacing: 'space',
  widths: 'width',
  radius: 'radius',
}

export function isSafeTokenName(name: string): boolean {
  return /^[a-z0-9][a-z0-9_-]*$/i.test(name)
}

/** Wartość nie może wyjść poza deklarację CSS. */
export function isSafeTokenValue(value: string): boolean {
  return value.trim() !== '' && !hasControlChars(value) && !/[;{}<>\\]/.test(value) && !value.includes('/*')
}

export function emptyTokens(): TokensDocument {
  return { colors: {}, typography: {}, spacing: {}, widths: {}, radius: {}, breakpoints: {} }
}

export function tokensToCss(tokens: TokensDocument, selector = ':root'): string {
  const lines: string[] = []
  for (const group of TOKEN_GROUPS) {
    const prefix = CSS_PREFIX[group]
    if (!prefix) continue
    const entries = Object.entries(tokens[group] ?? {}) as [string, TokenValue][]
    for (const [name, token] of entries) {
      if (!isSafeTokenName(name) || typeof token?.value !== 'string' || !isSafeTokenValue(token.value)) continue
      lines.push(`  --${prefix}-${name}: ${token.value.trim()};`)
    }
  }
  return `${selector} {\n${lines.join('\n')}\n}\n`
}

export function colorTokenVar(name: string): string {
  return `var(--color-${name})`
}
