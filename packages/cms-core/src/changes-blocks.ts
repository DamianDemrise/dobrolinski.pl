/**
 * Uprawnienia dla zmian listy bloków strony. Restrictions bloków są egzekwowane tu
 * (po stronie serwera): złamanie removable/movable/hideable/maxPerPage → MODE_DEVELOPER.
 */
import { deepEqual, diffValues } from './diff'
import { DEFAULT_RESTRICTIONS, getAtPath, getFieldChain } from './fields'
import type { Permission } from './permissions'
import { visibilityClasses } from './resolve'
import type { BlockInstance, BlockRestrictions, ComponentDocument, FieldDef, Props, SiteSchema } from './types'
import { isPlainObject } from './util'

export type Need = Set<Permission>
export type Components = Record<string, ComponentDocument>

/** Poziom i zakładka całego łańcucha pól; nieznane pole = tylko developer. */
export function addFieldPerms(need: Need, chain: FieldDef[] | undefined): void {
  if (!chain) {
    need.add('MODE_DEVELOPER')
    return
  }
  for (const field of chain) {
    if (field.level === 'advanced') need.add('MODE_ADVANCED')
    if (field.level === 'developer') need.add('MODE_DEVELOPER')
    if (field.tab === 'seo') need.add('SEO_EDIT')
  }
}

export function addDiffPerms(need: Need, fields: FieldDef[], before: unknown, after: unknown, skip?: (path: string, value: unknown) => boolean): void {
  for (const d of diffValues(before, after)) {
    if (skip?.(d.path, d.after)) continue
    addFieldPerms(need, getFieldChain(fields, d.path))
  }
}

interface BlockInfo {
  /** Typ bloku po rozwiązaniu (dla instancji: blockType komponentu). */
  type: string
  fields: FieldDef[]
  /** Punkt odniesienia treści: defaults (blok) albo {} (overrides instancji). */
  baseline: Props
  /** Treść: props (blok) albo overrides (instancja). */
  content: unknown
  restrictions: BlockRestrictions
  maxPerPage?: number
}

/** undefined = nie da się ustalić definicji (nieznany typ, brak komponentu albo brak `components`). */
function infoFor(block: BlockInstance, schema: SiteSchema, components?: Components): BlockInfo | undefined {
  const isGlobal = block.type === 'global'
  const component = isGlobal && components && block.ref && Object.hasOwn(components, block.ref) ? components[block.ref] : undefined
  const type = isGlobal ? component?.blockType : block.type
  if (!type || type === 'global' || !Object.hasOwn(schema.blocks, type)) return undefined
  const def = schema.blocks[type]!
  return {
    type,
    fields: def.fields,
    baseline: isGlobal ? {} : (def.defaults ?? {}),
    content: isGlobal ? (block.overrides ?? {}) : block.props,
    restrictions: def.restrictions ?? DEFAULT_RESTRICTIONS,
    maxPerPage: def.maxPerPage,
  }
}

function isEmpty(value: unknown): boolean {
  return value === undefined || (isPlainObject(value) && Object.keys(value).length === 0)
}

/** Usunięty blok (lub zmieniony typ): prawa do każdego pola różnego od domyślnego + removable. */
function addRemovedPerms(need: Need, block: BlockInstance, schema: SiteSchema, components?: Components): void {
  const info = infoFor(block, schema, components)
  if (!info) {
    // instancja bez znanego komponentu: wolno usunąć tylko pustą
    if (block.type !== 'global' || !isEmpty(block.overrides)) need.add('MODE_DEVELOPER')
    return
  }
  if (!info.restrictions.removable) need.add('MODE_DEVELOPER')
  // pole nieustawione = domyślne, więc nic nie jest kasowane
  addDiffPerms(need, info.fields, info.baseline, info.content, (_path, value) => value === undefined)
}

/** Nowy blok: pola różne od domyślnych; wartość obecna już w bloku tego typu (duplikat) nie podnosi praw. */
function addAddedPerms(need: Need, block: BlockInstance, before: BlockInstance[], schema: SiteSchema, components?: Components): void {
  const info = infoFor(block, schema, components)
  if (!info) {
    if (block.type !== 'global' || !isEmpty(block.overrides) || components) need.add('MODE_DEVELOPER')
    return
  }
  const peersSame = before.filter(b => b.type === block.type).map(b => infoFor(b, schema, components)?.content)
  const seen = (path: string, value: unknown) => value === undefined || peersSame.some(c => deepEqual(getAtPath(c, path), value))
  addDiffPerms(need, info.fields, info.baseline, info.content, seen)
}

function addSameBlockPerms(need: Need, prev: BlockInstance, block: BlockInstance, schema: SiteSchema, components?: Components): void {
  const info = infoFor(block, schema, components)
  const isGlobal = block.type === 'global'
  for (const key of new Set([...Object.keys(prev), ...Object.keys(block)])) {
    const b = (prev as unknown as Record<string, unknown>)[key]
    const a = (block as unknown as Record<string, unknown>)[key]
    if (deepEqual(b, a)) continue
    if (key === 'hidden' || key === 'visibility') {
      const hides = key === 'hidden' ? a === true : visibilityClasses(a as BlockInstance['visibility']).length > 0
      const restrictions = info?.restrictions ?? (isGlobal ? DEFAULT_RESTRICTIONS : undefined)
      if (hides && !restrictions?.hideable) need.add('MODE_DEVELOPER')
    }
    else if (isGlobal && key === 'ref') {
      need.add('MODE_ADVANCED')
      if (!components) need.add('MODE_DEVELOPER')
      else addRemovedPerms(need, prev, schema, components)
    }
    else if (isGlobal && key === 'overrides') {
      if (!info) need.add('MODE_DEVELOPER')
      else if (prev.ref === block.ref) addDiffPerms(need, info.fields, b ?? {}, a ?? {})
      else addAddedPerms(need, block, [], schema, components)
    }
    else if (!isGlobal && key === 'props' && info) addDiffPerms(need, info.fields, b, a)
    else need.add('MODE_DEVELOPER')
  }
}

/** Kolejność względna bloków z movable:false wśród bloków obecnych przed i po. */
function addOrderPerms(need: Need, before: BlockInstance[], after: BlockInstance[], schema: SiteSchema, components?: Components): void {
  const afterIds = new Map(after.map(b => [b.id, b]))
  const common = before.filter(b => afterIds.get(b.id)?.type === b.type).map(b => b.id)
  const commonSet = new Set(common)
  const afterOrder = after.filter(b => commonSet.has(b.id)).map(b => b.id)
  for (const id of common) {
    const info = infoFor(afterIds.get(id)!, schema, components)
    if (info?.restrictions.movable !== false) continue
    // te same bloki przed nim przed i po zmianie
    const i = common.indexOf(id)
    const beforeSet = new Set(common.slice(0, i))
    if (afterOrder.indexOf(id) !== i || !afterOrder.slice(0, i).every(x => beforeSet.has(x))) need.add('MODE_DEVELOPER')
  }
}

function addMaxPerPagePerms(need: Need, after: BlockInstance[], schema: SiteSchema, components?: Components): void {
  const counts = new Map<string, number>()
  for (const block of after) {
    const info = infoFor(block, schema, components)
    if (!info) continue
    const n = (counts.get(info.type) ?? 0) + 1
    counts.set(info.type, n)
    if (info.maxPerPage !== undefined && n > info.maxPerPage) need.add('MODE_DEVELOPER')
  }
}

function asBlocks(value: unknown): BlockInstance[] | undefined {
  return Array.isArray(value) && value.every(b => isPlainObject(b) && typeof b.id === 'string' && typeof b.type === 'string')
    ? value as BlockInstance[]
    : undefined
}

export function addBlocksPerms(need: Need, beforeRaw: unknown, afterRaw: unknown, schema: SiteSchema, components?: Components): void {
  need.add('CONTENT_EDIT')
  const before = asBlocks(beforeRaw)
  const after = asBlocks(afterRaw)
  if (!before || !after) {
    need.add('MODE_DEVELOPER')
    return
  }
  const oldById = new Map(before.map(b => [b.id, b]))
  const newById = new Map(after.map(b => [b.id, b]))
  for (const prev of before) {
    const next = newById.get(prev.id)
    if (!next || next.type !== prev.type) addRemovedPerms(need, prev, schema, components)
  }
  for (const block of after) {
    const prev = oldById.get(block.id)
    if (!prev || prev.type !== block.type) addAddedPerms(need, block, before, schema, components)
    else addSameBlockPerms(need, prev, block, schema, components)
  }
  addOrderPerms(need, before, after, schema, components)
  addMaxPerPagePerms(need, after, schema, components)
}
