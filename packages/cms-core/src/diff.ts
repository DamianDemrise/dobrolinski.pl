/** Różnice między wartościami i stabilna serializacja (klucze posortowane). */
import { isPlainObject, joinPath } from './util'

export interface ValueDiff {
  path: string
  before: unknown
  after: unknown
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(normalize(value)) ?? 'null'
}

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(v => (v === undefined ? null : normalize(v)))
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value).sort()) {
      if (value[key] !== undefined) out[key] = normalize(value[key])
    }
    return out
  }
  return value
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  return stableStringify(a) === stableStringify(b)
}

function isContainer(value: unknown): value is Record<string, unknown> | unknown[] {
  return Array.isArray(value) || isPlainObject(value)
}

function isEmptyContainer(value: Record<string, unknown> | unknown[]): boolean {
  return Array.isArray(value) ? value.length === 0 : Object.keys(value).length === 0
}

/**
 * Różnice liści. Tablice porównywane po indeksie. Dodany/usunięty niepusty obiekt
 * rozpisywany jest na liście (żeby było widać każde dotknięte pole).
 */
export function diffValues(before: unknown, after: unknown, path = ''): ValueDiff[] {
  if (before === after) return []
  const bothArrays = Array.isArray(before) && Array.isArray(after)
  const bothObjects = isPlainObject(before) && isPlainObject(after)
  const addedTree = before === undefined && isContainer(after) && !isEmptyContainer(after)
  const removedTree = after === undefined && isContainer(before) && !isEmptyContainer(before)

  if (bothArrays || (addedTree && Array.isArray(after)) || (removedTree && Array.isArray(before))) {
    const b = (Array.isArray(before) ? before : []) as unknown[]
    const a = (Array.isArray(after) ? after : []) as unknown[]
    const out: ValueDiff[] = []
    for (let i = 0; i < Math.max(b.length, a.length); i++) {
      out.push(...diffValues(b[i], a[i], joinPath(path, i)))
    }
    return out
  }
  if (bothObjects || addedTree || removedTree) {
    const b = (isPlainObject(before) ? before : {}) as Record<string, unknown>
    const a = (isPlainObject(after) ? after : {}) as Record<string, unknown>
    const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])].sort()
    return keys.flatMap(k => diffValues(b[k], a[k], joinPath(path, k)))
  }
  if (deepEqual(before, after)) return []
  return [{ path, before, after }]
}
