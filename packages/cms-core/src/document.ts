/**
 * Operacje na dokumencie strony. Czyste i niemutujące: zwracają nowy dokument.
 *
 * Kody CmsError (wszystkie w pakiecie):
 *   block_not_found     brak bloku o podanym id
 *   unknown_block_type  typ bloku nie istnieje w schemacie (albo blok global bez ref)
 *   unknown_layout      layout strony nie istnieje w schemacie
 *   region_not_allowed  obszar bloku nie należy do layoutu strony
 *   region_mismatch     przesunięcie/wstawienie poza kolejność obszarów layoutu
 *   not_movable | not_hideable | not_duplicable | not_removable   restrictions bloku
 *   max_per_page        przekroczony maxPerPage
 *   duplicate_id        id bloku już istnieje na stronie
 *   invalid_index       indeks poza zakresem
 *   invalid_path        niedozwolona ścieżka (fields.ts: setAtPath/getAtPath)
 *   missing_component   brak komponentu globalnego (resolve.ts)
 */
import { CmsError } from './errors'
import { DEFAULT_RESTRICTIONS, setAtPath } from './fields'
import { setResponsive } from './resolve'
import type { BlockInstance, BlockRestrictions, Device, PageDocument, PatternDocument, SiteSchema } from './types'
import { isPlainObject } from './util'

export { CmsError } from './errors'

const ALPHABET = '0123456789abcdefghijklmnopqrstuv'

/** Krótki losowy id, np. 'b_k3v9q0d1ma'. */
export function newId(prefix = 'b'): string {
  const bytes = new Uint8Array(10)
  crypto.getRandomValues(bytes)
  let out = ''
  for (const b of bytes) out += ALPHABET[b & 31]
  return prefix ? `${prefix}_${out}` : out
}

export function findBlock(doc: PageDocument, blockId: string): BlockInstance | undefined {
  return doc.blocks.find(b => b.id === blockId)
}

function indexOrThrow(doc: PageDocument, blockId: string): number {
  const i = doc.blocks.findIndex(b => b.id === blockId)
  if (i < 0) throw new CmsError('block_not_found', `Brak bloku "${blockId}"`)
  return i
}

function restrictionsFor(block: BlockInstance, schema: SiteSchema): BlockRestrictions {
  if (block.type === 'global') return DEFAULT_RESTRICTIONS
  const def = Object.hasOwn(schema.blocks, block.type) ? schema.blocks[block.type] : undefined
  if (!def) throw new CmsError('unknown_block_type', `Nieznany typ bloku "${block.type}"`)
  return def.restrictions
}

function replaceAt(doc: PageDocument, index: number, block: BlockInstance): PageDocument {
  const blocks = [...doc.blocks]
  blocks[index] = block
  return { ...doc, blocks }
}

/** Obszar bloku w kolejności layoutu; -1 gdy nieznany (global, nieznany typ). */
function regionIndex(block: BlockInstance, schema: SiteSchema, regions: string[]): number {
  if (block.type === 'global' || !Object.hasOwn(schema.blocks, block.type)) return -1
  return regions.indexOf(schema.blocks[block.type]!.region)
}

/** Blok na pozycji `index` nie może stać przed obszarem poprzednika ani za obszarem następnika. */
function assertRegionOrder(doc: PageDocument, blocks: BlockInstance[], index: number, schema: SiteSchema): void {
  const layout = Object.hasOwn(schema.layouts, doc.layout) ? schema.layouts[doc.layout] : undefined
  const block = blocks[index]
  if (!layout || !block) return
  const own = regionIndex(block, schema, layout.regions)
  if (own < 0) return
  for (let i = index - 1; i >= 0; i--) {
    const r = regionIndex(blocks[i]!, schema, layout.regions)
    if (r < 0) continue
    if (r > own) throw new CmsError('region_mismatch', 'Blok nie może opuścić swojego obszaru')
    break
  }
  for (let i = index + 1; i < blocks.length; i++) {
    const r = regionIndex(blocks[i]!, schema, layout.regions)
    if (r < 0) continue
    if (r < own) throw new CmsError('region_mismatch', 'Blok nie może opuścić swojego obszaru')
    break
  }
}

function assertIndex(index: number, max: number): void {
  if (!Number.isInteger(index) || index < 0 || index > max) throw new CmsError('invalid_index', `Indeks ${index} poza zakresem 0..${max}`)
}

function assertMaxPerPage(doc: PageDocument, type: string, schema: SiteSchema): void {
  if (type === 'global') return
  const max = schema.blocks[type]?.maxPerPage
  if (max !== undefined && doc.blocks.filter(b => b.type === type).length >= max) {
    throw new CmsError('max_per_page', `Blok "${type}" może wystąpić najwyżej ${max} raz(y)`)
  }
}

/** Ścieżka względem props; dla instancji globalnej zapis trafia do overrides. */
export function updateBlockProps(doc: PageDocument, blockId: string, path: string, value: unknown): PageDocument {
  const i = indexOrThrow(doc, blockId)
  const block = doc.blocks[i]!
  if (block.type === 'global') return replaceAt(doc, i, { ...block, overrides: setAtPath(block.overrides ?? {}, path, value) })
  return replaceAt(doc, i, { ...block, props: setAtPath(block.props, path, value) })
}

export function moveBlock(doc: PageDocument, blockId: string, toIndex: number, schema: SiteSchema): PageDocument {
  const from = indexOrThrow(doc, blockId)
  assertIndex(toIndex, doc.blocks.length - 1)
  if (from === toIndex) return doc
  if (!restrictionsFor(doc.blocks[from]!, schema).movable) throw new CmsError('not_movable', 'Tego bloku nie można przesuwać')
  const blocks = [...doc.blocks]
  const [moved] = blocks.splice(from, 1)
  blocks.splice(toIndex, 0, moved!)
  assertRegionOrder(doc, blocks, toIndex, schema)
  // Ta sama reguła co po stronie serwera (changes-blocks.ts): blok stały zachowuje zbiór bloków przed sobą,
  // więc nie wolno też przeskoczyć innym blokiem przez blok nieprzesuwalny.
  doc.blocks.forEach((block, i) => {
    if (restrictionsFor(block, schema).movable) return
    const beforeIds = new Set(doc.blocks.slice(0, i).map(b => b.id))
    const j = blocks.findIndex(b => b.id === block.id)
    if (j !== i || !blocks.slice(0, j).every(b => beforeIds.has(b.id))) {
      throw new CmsError('not_movable', 'Nie można przesunąć bloku ponad blok o stałej pozycji')
    }
  })
  return { ...doc, blocks }
}

export function setBlockHidden(doc: PageDocument, blockId: string, hidden: boolean, schema: SiteSchema): PageDocument {
  const i = indexOrThrow(doc, blockId)
  const block = doc.blocks[i]!
  if (hidden && !restrictionsFor(block, schema).hideable) throw new CmsError('not_hideable', 'Tego bloku nie można ukryć')
  const { hidden: _prev, ...rest } = block
  return replaceAt(doc, i, hidden ? { ...rest, hidden: true } : rest)
}

/** visible === undefined usuwa nadpisanie urządzenia (dziedziczy). Pełna widoczność = brak pola. */
export function setBlockVisibility(doc: PageDocument, blockId: string, device: Device, visible: boolean | undefined): PageDocument {
  const i = indexOrThrow(doc, blockId)
  const { visibility, ...rest } = doc.blocks[i]!
  const next = setResponsive<boolean>(visibility ?? true, device, device === 'desktop' ? (visible ?? true) : visible)
  const allVisible = next.desktop && next.tablet === undefined && next.mobile === undefined
  return replaceAt(doc, i, allVisible ? rest : { ...rest, visibility: next })
}

/** Nowe _id w elementach list (rekurencyjnie). */
export function freshListIds<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => {
      const copy = freshListIds(item)
      return isPlainObject(copy) && typeof copy._id === 'string' ? { ...copy, _id: newId('i') } : copy
    }) as T
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = freshListIds(v)
    return out as T
  }
  return value
}

function cloneWithNewIds(block: BlockInstance, taken: Set<string>): BlockInstance {
  let id = newId('b')
  while (taken.has(id)) id = newId('b')
  taken.add(id)
  const copy: BlockInstance = { ...structuredClone(block), id, props: freshListIds(structuredClone(block.props ?? {})) }
  if (block.overrides) copy.overrides = freshListIds(structuredClone(block.overrides))
  return copy
}

export function duplicateBlock(doc: PageDocument, blockId: string, schema: SiteSchema): PageDocument {
  const i = indexOrThrow(doc, blockId)
  const block = doc.blocks[i]!
  if (!restrictionsFor(block, schema).duplicable) throw new CmsError('not_duplicable', 'Tego bloku nie można duplikować')
  assertMaxPerPage(doc, block.type, schema)
  const blocks = [...doc.blocks]
  blocks.splice(i + 1, 0, cloneWithNewIds(block, new Set(doc.blocks.map(b => b.id))))
  return { ...doc, blocks }
}

export function removeBlock(doc: PageDocument, blockId: string, schema: SiteSchema): PageDocument {
  const i = indexOrThrow(doc, blockId)
  if (!restrictionsFor(doc.blocks[i]!, schema).removable) throw new CmsError('not_removable', 'Tego bloku nie można usunąć')
  return { ...doc, blocks: doc.blocks.filter((_, j) => j !== i) }
}

export function insertBlock(doc: PageDocument, block: BlockInstance, index: number, schema: SiteSchema): PageDocument {
  assertIndex(index, doc.blocks.length)
  if (block.type === 'global') {
    if (!block.ref) throw new CmsError('unknown_block_type', 'Blok globalny bez ref')
  }
  else {
    restrictionsFor(block, schema)
    const layout = Object.hasOwn(schema.layouts, doc.layout) ? schema.layouts[doc.layout] : undefined
    if (!layout) throw new CmsError('unknown_layout', `Nieznany układ "${doc.layout}"`)
    const region = schema.blocks[block.type]!.region
    if (!layout.regions.includes(region)) throw new CmsError('region_not_allowed', `Obszar "${region}" nie istnieje w układzie "${doc.layout}"`)
  }
  if (doc.blocks.some(b => b.id === block.id)) throw new CmsError('duplicate_id', `Blok "${block.id}" już istnieje`)
  assertMaxPerPage(doc, block.type, schema)
  const blocks = [...doc.blocks]
  blocks.splice(index, 0, structuredClone(block))
  assertRegionOrder(doc, blocks, index, schema)
  return { ...doc, blocks }
}

/** Wstawia kopie bloków wzorca z nowymi id (także _id w listach). */
export function insertPattern(doc: PageDocument, pattern: PatternDocument, index: number): PageDocument {
  assertIndex(index, doc.blocks.length)
  const taken = new Set(doc.blocks.map(b => b.id))
  const copies = pattern.blocks.map(b => cloneWithNewIds(b, taken))
  const blocks = [...doc.blocks]
  blocks.splice(index, 0, ...copies)
  return { ...doc, blocks }
}
