/** Definicje pól, walidacja wartości i ścieżki w props. */
import { CmsError } from './errors'
import { linkMarkupHrefs } from './links'
import { isSafeUrl } from './url'
import { isResponsive } from './resolve'
import { DEVICES } from './types'
import type { BlockDefinition, BlockRestrictions, FieldDef, Props, ValidationIssue } from './types'
import { FORBIDDEN_KEYS, hasControlChars, isPlainObject, joinPath } from './util'

export { isSafeUrl } from './url'

export const DEFAULT_RESTRICTIONS: BlockRestrictions = { movable: true, removable: true, hideable: true, duplicable: true }

/** Definicja bloku z opcjonalnymi restrictions (uzupełniane domyślnymi). */
export type BlockDefinitionInput = Omit<BlockDefinition, 'restrictions'> & { restrictions?: Partial<BlockRestrictions> }

export function defineBlock(def: BlockDefinitionInput): BlockDefinition {
  return { ...def, restrictions: { ...DEFAULT_RESTRICTIONS, ...def.restrictions } }
}

function isSafeImageSrc(src: string): boolean {
  return isSafeUrl(src) && (src.startsWith('https://') || (src.startsWith('/') && !src.startsWith('//')))
}

const issue = (path: string, message: string): ValidationIssue => ({ path, message })

export function validateFields(fields: FieldDef[], value: Props, path = ''): ValidationIssue[] {
  return validateObject(fields, value, path, [])
}

export function validateBlock(def: BlockDefinition, props: Props, path = ''): ValidationIssue[] {
  return validateFields(def.fields, props, path)
}

function validateObject(fields: FieldDef[], value: unknown, path: string, extraKeys: string[]): ValidationIssue[] {
  if (!isPlainObject(value)) return [issue(path, 'Oczekiwano obiektu')]
  const known = new Set([...fields.map(f => f.key), ...extraKeys])
  const issues: ValidationIssue[] = []
  for (const key of Object.keys(value)) {
    if (!known.has(key)) issues.push(issue(joinPath(path, key), 'Nieznane pole'))
  }
  for (const field of fields) issues.push(...validateField(field, value[field.key], joinPath(path, field.key)))
  return issues
}

function validateField(field: FieldDef, value: unknown, path: string): ValidationIssue[] {
  if (value === undefined || value === null) return field.required ? [issue(path, 'Pole wymagane')] : []
  if (field.responsive && isResponsive(value)) {
    return DEVICES.flatMap((d) => {
      const v = value[d]
      return v === undefined ? [] : validateValue(field, v, joinPath(path, d))
    })
  }
  return validateValue(field, value, path)
}

function validateString(value: unknown, path: string, opts: { required?: boolean, maxLength?: number, multiline?: boolean, format?: 'url' | 'links' }): ValidationIssue[] {
  if (typeof value !== 'string') return [issue(path, 'Oczekiwano tekstu')]
  if (hasControlChars(value, opts.multiline)) return [issue(path, 'Niedozwolone znaki sterujące')]
  if (opts.required && value.trim() === '') return [issue(path, 'Pole wymagane')]
  if (opts.maxLength !== undefined && value.length > opts.maxLength) return [issue(path, `Maksymalnie ${opts.maxLength} znaków`)]
  if (opts.format === 'url' && value !== '' && !isSafeUrl(value)) return [issue(path, 'Niedozwolony adres')]
  if (opts.format === 'links' && linkMarkupHrefs(value).some(h => !isSafeUrl(h))) return [issue(path, 'Niedozwolony adres w linku [[adres|etykieta]]')]
  return []
}

function validateValue(field: FieldDef, value: unknown, path: string): ValidationIssue[] {
  switch (field.type) {
    case 'text':
    case 'textarea':
      return validateString(value, path, { required: field.required, maxLength: field.maxLength, multiline: field.type === 'textarea', format: field.format })
    case 'lines': {
      if (!Array.isArray(value)) return [issue(path, 'Oczekiwano listy linii')]
      const out: ValidationIssue[] = []
      if (field.maxItems !== undefined && value.length > field.maxItems) out.push(issue(path, `Maksymalnie ${field.maxItems} linii`))
      value.forEach((line, i) => out.push(...validateString(line, joinPath(path, i), { maxLength: field.maxLength, format: field.format })))
      return out
    }
    case 'link': {
      if (!isPlainObject(value)) return [issue(path, 'Oczekiwano linku')]
      const out = unknownKeys(value, ['label', 'href'], path)
      out.push(...validateString(value.label, joinPath(path, 'label'), {}))
      const href = value.href
      if (typeof href !== 'string') out.push(issue(joinPath(path, 'href'), 'Oczekiwano adresu'))
      else if (href === '' ? field.required : !isSafeUrl(href)) out.push(issue(joinPath(path, 'href'), 'Niedozwolony adres linku'))
      return out
    }
    case 'image': {
      if (!isPlainObject(value)) return [issue(path, 'Oczekiwano obrazu')]
      const out = unknownKeys(value, ['mediaId', 'src', 'alt', 'width', 'height'], path)
      if (typeof value.src !== 'string' || !isSafeImageSrc(value.src)) out.push(issue(joinPath(path, 'src'), 'Obraz musi mieć ścieżkę /… albo https://'))
      out.push(...validateString(value.alt, joinPath(path, 'alt'), {}))
      if (value.mediaId !== undefined) out.push(...validateString(value.mediaId, joinPath(path, 'mediaId'), {}))
      for (const k of ['width', 'height'] as const) {
        const n = value[k]
        if (n !== undefined && (typeof n !== 'number' || !Number.isFinite(n) || n < 0)) out.push(issue(joinPath(path, k), 'Nieprawidłowy wymiar'))
      }
      return out
    }
    case 'select':
      return typeof value === 'string' && field.options.some(o => o.value === value) ? [] : [issue(path, 'Wartość spoza listy opcji')]
    case 'toggle':
      return typeof value === 'boolean' ? [] : [issue(path, 'Oczekiwano wartości tak/nie')]
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) return [issue(path, 'Oczekiwano liczby')]
      if (field.min !== undefined && value < field.min) return [issue(path, `Minimum ${field.min}`)]
      if (field.max !== undefined && value > field.max) return [issue(path, `Maksimum ${field.max}`)]
      return []
    case 'tokenColor':
      return typeof value === 'string' && field.allowed.includes(value) ? [] : [issue(path, 'Kolor spoza dozwolonych tokenów')]
    case 'list': {
      if (!Array.isArray(value)) return [issue(path, 'Oczekiwano listy')]
      const out: ValidationIssue[] = []
      if (field.minItems !== undefined && value.length < field.minItems) out.push(issue(path, `Minimum ${field.minItems} elementów`))
      if (field.maxItems !== undefined && value.length > field.maxItems) out.push(issue(path, `Maksimum ${field.maxItems} elementów`))
      value.forEach((item, i) => {
        const itemPath = joinPath(path, i)
        if (isPlainObject(item) && (typeof item._id !== 'string' || item._id === '')) out.push(issue(joinPath(itemPath, '_id'), 'Element listy bez _id'))
        out.push(...validateObject(field.fields, item, itemPath, ['_id']))
      })
      return out
    }
    case 'group':
      return validateObject(field.fields, value, path, [])
  }
}

function unknownKeys(value: Record<string, unknown>, allowed: string[], path: string): ValidationIssue[] {
  return Object.keys(value).filter(k => !allowed.includes(k)).map(k => issue(joinPath(path, k), 'Nieznane pole'))
}

/** Łańcuch pól od korzenia do pola wskazanego ścieżką ('items.2.title' → [items, title]). */
export function getFieldChain(fields: FieldDef[], path: string): FieldDef[] | undefined {
  const segs = path.split('.').filter(s => s !== '')
  const chain: FieldDef[] = []
  let current = fields
  let i = 0
  while (i < segs.length) {
    const field = current.find(f => f.key === segs[i])
    if (!field) return undefined
    chain.push(field)
    i++
    if (field.type === 'list') {
      if (i < segs.length && /^\d+$/.test(segs[i] ?? '')) i++
      else if (i < segs.length) return undefined
      if (i >= segs.length || segs[i] === '_id') return chain
      current = field.fields
    }
    else if (field.type === 'group') {
      if (i >= segs.length) return chain
      current = field.fields
    }
    else return chain
  }
  return chain.length ? chain : undefined
}

export function getFieldAtPath(fields: FieldDef[], path: string): FieldDef | undefined {
  return getFieldChain(fields, path)?.at(-1)
}

function splitPath(path: string): string[] {
  const segs = path.split('.').filter(s => s !== '')
  if (segs.some(s => FORBIDDEN_KEYS.has(s))) throw new CmsError('invalid_path', `Niedozwolona ścieżka "${path}"`)
  return segs
}

export function getAtPath(obj: unknown, path: string): unknown {
  let node = obj
  for (const seg of splitPath(path)) {
    if (Array.isArray(node)) node = /^\d+$/.test(seg) ? node[Number(seg)] : undefined
    else if (isPlainObject(node)) node = Object.hasOwn(node, seg) ? node[seg] : undefined
    else return undefined
  }
  return node
}

/** Niemutujące ustawienie wartości; `undefined` usuwa klucz obiektu. */
export function setAtPath<T>(obj: T, path: string, value: unknown): T {
  const segs = splitPath(path)
  if (segs.length === 0) return value as T
  return setIn(obj, segs, 0, value) as T
}

function setIn(node: unknown, segs: string[], i: number, value: unknown): unknown {
  const key = segs[i] as string
  const isIndex = /^\d+$/.test(key)
  const last = i === segs.length - 1
  if (Array.isArray(node) || (node === undefined && isIndex)) {
    if (!isIndex) throw new CmsError('invalid_path', `Oczekiwano indeksu w "${segs.join('.')}"`)
    const copy = Array.isArray(node) ? [...node] : []
    copy[Number(key)] = last ? value : setIn(copy[Number(key)], segs, i + 1, value)
    return copy
  }
  const copy: Record<string, unknown> = isPlainObject(node) ? { ...node } : {}
  const next = last ? value : setIn(Object.hasOwn(copy, key) ? copy[key] : undefined, segs, i + 1, value)
  if (next === undefined) return Object.fromEntries(Object.entries(copy).filter(([k]) => k !== key))
  copy[key] = next
  return copy
}
