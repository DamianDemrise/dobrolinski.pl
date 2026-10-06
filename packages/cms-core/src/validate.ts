/** Walidacja dokumentów encji (strona, global, komponent, wzorzec, tokeny). */
import { validateBlock, validateFields } from './fields'
import { isResponsive } from './resolve'
import { isSafeTokenName, isSafeTokenValue, TOKEN_GROUPS } from './tokens'
import type { BlockDefinition, ComponentDocument, EntityKind, Props, SiteSchema, ValidationIssue } from './types'
import { hasControlChars, isPlainObject, joinPath } from './util'

const issue = (path: string, message: string): ValidationIssue => ({ path, message })
const BLOCK_KEYS = ['id', 'type', 'props', 'hidden', 'visibility', 'ref', 'overrides']
const PAGE_KEYS = ['title', 'slug', 'layout', 'seo', 'blocks']
const SLUG_RE = /^(?:[a-z0-9]+(?:-[a-z0-9]+)*)(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/

function str(value: unknown, path: string, required = false): ValidationIssue[] {
  if (typeof value !== 'string') return [issue(path, 'Oczekiwano tekstu')]
  if (hasControlChars(value)) return [issue(path, 'Niedozwolone znaki sterujące')]
  return required && value.trim() === '' ? [issue(path, 'Pole wymagane')] : []
}

function unknownKeys(value: Record<string, unknown>, allowed: string[], path: string): ValidationIssue[] {
  return Object.keys(value).filter(k => !allowed.includes(k)).map(k => issue(joinPath(path, k), 'Nieznane pole'))
}

export function blockDefinition(schema: SiteSchema, type: string): BlockDefinition | undefined {
  return Object.hasOwn(schema.blocks, type) ? schema.blocks[type] : undefined
}

export type Components = Record<string, ComponentDocument>

/** Nadpisania instancji: ref istnieje (id encji), klucze ⊆ exposed, wartości wg pól typu bloku komponentu. */
function validateOverrides(ref: string, overrides: unknown, schema: SiteSchema, components: Components, path: string): ValidationIssue[] {
  const component = Object.hasOwn(components, ref) ? components[ref] : undefined
  if (!component) return [issue(joinPath(path, 'ref'), `Nieznany komponent "${ref}"`)]
  const def = blockDefinition(schema, component.blockType)
  if (!def) return [issue(joinPath(path, 'ref'), 'Komponent ma nieznany typ bloku')]
  if (overrides === undefined) return []
  if (!isPlainObject(overrides)) return [issue(joinPath(path, 'overrides'), 'Oczekiwano obiektu')]
  const p = joinPath(path, 'overrides')
  const out = Object.keys(overrides).filter(k => !component.exposed.includes(k)).map(k => issue(joinPath(p, k), 'Pole nie jest wystawione do nadpisania'))
  const fields = def.fields.filter(f => component.exposed.includes(f.key) && Object.hasOwn(overrides, f.key))
  const values: Props = Object.fromEntries(fields.map(f => [f.key, overrides[f.key]]))
  return [...out, ...validateFields(fields, values, p)]
}

function validateBlockInstance(block: unknown, schema: SiteSchema, path: string, regions?: string[], components?: Components): ValidationIssue[] {
  if (!isPlainObject(block)) return [issue(path, 'Oczekiwano bloku')]
  const out = unknownKeys(block, BLOCK_KEYS, path)
  out.push(...str(block.id, joinPath(path, 'id'), true))
  if (block.hidden !== undefined && typeof block.hidden !== 'boolean') out.push(issue(joinPath(path, 'hidden'), 'Oczekiwano tak/nie'))
  if (block.visibility !== undefined) {
    const v = block.visibility
    if (!isResponsive(v) || !Object.values(v).every(x => typeof x === 'boolean')) out.push(issue(joinPath(path, 'visibility'), 'Nieprawidłowa widoczność'))
  }
  if (!isPlainObject(block.props)) out.push(issue(joinPath(path, 'props'), 'Oczekiwano obiektu'))
  if (block.type === 'global') {
    out.push(...str(block.ref, joinPath(path, 'ref'), true))
    if (block.overrides !== undefined && !isPlainObject(block.overrides)) out.push(issue(joinPath(path, 'overrides'), 'Oczekiwano obiektu'))
    else if (components && typeof block.ref === 'string') out.push(...validateOverrides(block.ref, block.overrides, schema, components, path))
    return out
  }
  const def = typeof block.type === 'string' ? blockDefinition(schema, block.type) : undefined
  if (!def) return [...out, issue(joinPath(path, 'type'), 'Nieznany typ bloku')]
  if (block.ref !== undefined || block.overrides !== undefined) out.push(issue(path, 'ref/overrides tylko dla bloku globalnego'))
  if (regions && !regions.includes(def.region)) out.push(issue(joinPath(path, 'type'), `Blok niedozwolony w tym układzie (obszar ${def.region})`))
  if (isPlainObject(block.props)) out.push(...validateBlock(def, block.props, joinPath(path, 'props')))
  return out
}

function validateBlockList(blocks: unknown, schema: SiteSchema, path: string, regions?: string[], components?: Components): ValidationIssue[] {
  if (!Array.isArray(blocks)) return [issue(path, 'Oczekiwano listy bloków')]
  const out: ValidationIssue[] = []
  const ids = new Set<string>()
  const counts = new Map<string, number>()
  blocks.forEach((block, i) => {
    const p = joinPath(path, i)
    out.push(...validateBlockInstance(block, schema, p, regions, components))
    if (!isPlainObject(block)) return
    if (typeof block.id === 'string') {
      if (ids.has(block.id)) out.push(issue(joinPath(p, 'id'), 'Powtórzone id bloku'))
      ids.add(block.id)
    }
    // instancja globalna liczy się do limitu typu bloku komponentu
    const ref = typeof block.ref === 'string' && components && Object.hasOwn(components, block.ref) ? components[block.ref] : undefined
    const type = block.type === 'global' ? ref?.blockType : block.type
    if (typeof type !== 'string') return
    const n = (counts.get(type) ?? 0) + 1
    counts.set(type, n)
    const max = blockDefinition(schema, type)?.maxPerPage
    if (max !== undefined && n === max + 1) out.push(issue(p, `Blok może wystąpić najwyżej ${max} raz(y) na stronie`))
  })
  return out
}

/** `components` (id encji → dokument): gdy podane, instancje globalne są sprawdzane z komponentem. */
export function validatePage(doc: unknown, schema: SiteSchema, components?: Components): ValidationIssue[] {
  if (!isPlainObject(doc)) return [issue('', 'Oczekiwano dokumentu strony')]
  const out = unknownKeys(doc, PAGE_KEYS, '')
  out.push(...str(doc.title, 'title', true))
  if (typeof doc.slug !== 'string' || (doc.slug !== '' && !SLUG_RE.test(doc.slug))) out.push(issue('slug', 'Nieprawidłowy slug'))
  const layout = typeof doc.layout === 'string' && Object.hasOwn(schema.layouts, doc.layout) ? schema.layouts[doc.layout] : undefined
  if (!layout) out.push(issue('layout', 'Nieznany układ strony'))
  out.push(...(isPlainObject(doc.seo) ? validateFields(schema.seoFields, doc.seo, 'seo') : [issue('seo', 'Oczekiwano obiektu')]))
  out.push(...validateBlockList(doc.blocks, schema, 'blocks', layout?.regions, components))
  return out
}

function validateTokens(data: Record<string, unknown>): ValidationIssue[] {
  const out = unknownKeys(data, [...TOKEN_GROUPS], '')
  for (const group of TOKEN_GROUPS) {
    const values = data[group]
    if (!isPlainObject(values)) {
      out.push(issue(group, 'Oczekiwano obiektu'))
      continue
    }
    for (const [name, token] of Object.entries(values)) {
      const p = joinPath(group, name)
      if (!isSafeTokenName(name)) out.push(issue(p, 'Nieprawidłowa nazwa tokenu'))
      if (!isPlainObject(token) || typeof token.value !== 'string' || !isSafeTokenValue(token.value)) out.push(issue(joinPath(p, 'value'), 'Nieprawidłowa wartość tokenu'))
      else out.push(...unknownKeys(token, ['value', 'label'], p), ...str(token.label, joinPath(p, 'label')))
    }
  }
  return out
}

export function validateEntityData(kind: EntityKind, data: unknown, schema: SiteSchema, ctx: { slug: string, components?: Components }): ValidationIssue[] {
  if (!isPlainObject(data)) return [issue('', 'Oczekiwano obiektu')]
  switch (kind) {
    case 'page': {
      const out = validatePage(data, schema, ctx.components)
      if (data.slug !== ctx.slug) out.push(issue('slug', 'Slug dokumentu różni się od slugu encji'))
      return out
    }
    case 'global': {
      const def = Object.hasOwn(schema.globals, ctx.slug) ? schema.globals[ctx.slug] : undefined
      return def ? validateFields(def.fields, data, '') : [issue('', `Nieznany global "${ctx.slug}"`)]
    }
    case 'component': {
      const out = unknownKeys(data, ['name', 'blockType', 'props', 'exposed'], '')
      out.push(...str(data.name, 'name', true))
      const def = typeof data.blockType === 'string' ? blockDefinition(schema, data.blockType) : undefined
      if (!def) return [...out, issue('blockType', 'Nieznany typ bloku')]
      out.push(...(isPlainObject(data.props) ? validateBlock(def, data.props, 'props') : [issue('props', 'Oczekiwano obiektu')]))
      const exposed = data.exposed
      if (!Array.isArray(exposed)) out.push(issue('exposed', 'Oczekiwano listy pól'))
      else exposed.forEach((key, i) => {
        if (typeof key !== 'string' || !def.fields.some(f => f.key === key)) out.push(issue(joinPath('exposed', i), 'Nieznane pole'))
      })
      return out
    }
    case 'pattern': {
      const out = unknownKeys(data, ['name', 'blocks'], '')
      out.push(...str(data.name, 'name', true), ...validateBlockList(data.blocks, schema, 'blocks', undefined, ctx.components))
      return out
    }
    case 'tokens':
      return validateTokens(data)
    default:
      return [issue('', 'Nieznany rodzaj encji')]
  }
}
