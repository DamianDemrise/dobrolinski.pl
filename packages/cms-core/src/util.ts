/** Wspólne pomocniki bez zależności. */

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/** Znaki sterujące (0–31, 127); opcjonalnie dopuszcza \n. */
export function hasControlChars(value: string, allowNewline = false): boolean {
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i)
    if (c === 127 || (c < 32 && !(allowNewline && c === 10))) return true
  }
  return false
}

export function joinPath(base: string, key: string | number): string {
  return base === '' ? String(key) : `${base}.${key}`
}

export const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
