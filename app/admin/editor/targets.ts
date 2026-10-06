/**
 * Rozpoznanie celu na canvasie (pole bloku / pole globalu): definicja pola, wartość
 * i czy wolno je edytować. Wspólne dla edytora (rodzic) i canvasu (iframe).
 */
import type { BlockDefinition, BlockInstance, ComponentDocument, FieldDef, GlobalDocument, PageDocument, SiteSchema } from '@demrise/cms-core'
import { findBlock, getAtPath, getFieldAtPath, resolveBlock } from '@demrise/cms-core'
import type { CanvasTarget, EditMode } from './protocol'
import { levelAllowed, MODE_LABELS } from './protocol'

export interface SiteView {
  globals: Record<string, GlobalDocument>
  components: Record<string, ComponentDocument>
}

export interface ResolvedTarget {
  block?: BlockInstance
  def?: BlockDefinition
  component?: ComponentDocument
  field?: FieldDef
  value: unknown
  /** null = można edytować. */
  lock: string | null
}

export function blockDefinition(block: BlockInstance, components: Record<string, ComponentDocument>, schema: SiteSchema): { def?: BlockDefinition, component?: ComponentDocument } {
  if (block.type === 'global') {
    const component = block.ref && Object.hasOwn(components, block.ref) ? components[block.ref] : undefined
    return { component, def: component ? schema.blocks[component.blockType] : undefined }
  }
  return { def: Object.hasOwn(schema.blocks, block.type) ? schema.blocks[block.type] : undefined }
}

/** Props bloku po rozwiązaniu komponentu globalnego (to, co widać na stronie). */
export function resolvedProps(block: BlockInstance, components: Record<string, ComponentDocument>): Record<string, unknown> {
  try {
    return resolveBlock(block, components).props
  }
  catch {
    return block.props ?? {}
  }
}

export function resolveTarget(
  target: CanvasTarget,
  page: PageDocument,
  site: SiteView,
  schema: SiteSchema,
  opts: { mode: EditMode, canEdit: boolean },
): ResolvedTarget {
  const levelLock = (field: FieldDef | undefined): string | null => {
    if (!opts.canEdit) return 'Brak uprawnień do edycji treści'
    if (!field) return 'Nieznane pole'
    if (!levelAllowed(field.level, opts.mode)) return `Wymaga trybu ${MODE_LABELS[field.level ?? 'safe']}`
    return null
  }

  if (target.kind === 'global') {
    const fields = schema.globals[target.global]?.fields ?? []
    const field = getFieldAtPath(fields, target.field)
    const data = site.globals[target.global]
    return { field, value: data ? getAtPath(data, target.field) : undefined, lock: data ? levelLock(field) : 'Brak danych globalnych' }
  }

  const block = findBlock(page, target.blockId)
  if (!block) return { value: undefined, lock: 'Brak bloku' }
  const { def, component } = blockDefinition(block, site.components, schema)
  if (!target.field) return { block, def, component, value: undefined, lock: null }
  const field = def ? getFieldAtPath(def.fields, target.field) : undefined
  const value = getAtPath(resolvedProps(block, site.components), target.field)
  let lock = levelLock(field)
  if (!lock && component) {
    const top = target.field.split('.')[0] ?? ''
    if (!component.exposed.includes(top)) lock = 'Pole komponentu globalnego (edycja w definicji komponentu)'
  }
  return { block, def, component, field, value, lock }
}

/** Pole edytowalne bezpośrednio na canvasie (tekst/linia). */
export function inlineEditable(resolved: ResolvedTarget, path: string): boolean {
  const field = resolved.field
  if (!field || resolved.lock || field.inline !== true || typeof resolved.value !== 'string') return false
  if (field.type === 'text' || field.type === 'textarea') return true
  // 'lines': edytowalny pojedynczy element (ścieżka kończy się indeksem).
  return field.type === 'lines' && /\.\d+$/.test(path)
}
