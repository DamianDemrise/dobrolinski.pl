/** Rozwiązywanie instancji (komponenty globalne) i wartości responsywnych. */
import { CmsError } from './errors'
import { deepEqual } from './diff'
import { DEVICES } from './types'
import type { BlockInstance, ComponentDocument, Device, Props, Responsive } from './types'
import { isPlainObject } from './util'

export interface ResolvedBlock {
  id: string
  type: string
  props: Props
  hidden: boolean
  visibility?: Responsive<boolean>
  /** Id komponentu globalnego, z którego pochodzi blok. */
  globalRef?: string
}

export function resolveBlock(block: BlockInstance, components: Record<string, ComponentDocument>): ResolvedBlock {
  const base = { id: block.id, hidden: block.hidden === true, visibility: block.visibility }
  if (block.type !== 'global') return { ...base, type: block.type, props: { ...block.props } }

  const ref = block.ref ?? ''
  const component = Object.hasOwn(components, ref) ? components[ref] : undefined
  if (!component) throw new CmsError('missing_component', `Brak komponentu globalnego "${ref}"`)
  const props: Props = { ...component.props }
  const overrides = block.overrides ?? {}
  for (const key of component.exposed) {
    if (Object.hasOwn(overrides, key) && overrides[key] !== undefined) props[key] = overrides[key]
  }
  return { ...base, type: component.blockType, props, globalRef: ref }
}

export function resolveBlocks(blocks: BlockInstance[], components: Record<string, ComponentDocument>): ResolvedBlock[] {
  return blocks.map(b => resolveBlock(b, components))
}

/** Obiekt { desktop, tablet?, mobile? } bez innych kluczy. */
export function isResponsive<T>(value: unknown): value is Responsive<T> {
  if (!isPlainObject(value) || !Object.hasOwn(value, 'desktop')) return false
  return Object.keys(value).every(k => (DEVICES as readonly string[]).includes(k))
}

export function resolveResponsive<T>(value: Responsive<T> | T, device: Device): T {
  if (!isResponsive<T>(value)) return value as T
  if (device === 'mobile') return value.mobile ?? value.tablet ?? value.desktop
  if (device === 'tablet') return value.tablet ?? value.desktop
  return value.desktop
}

/** Ustawia wartość dla urządzenia; usuwa nadpisania równe wartości odziedziczonej. */
export function setResponsive<T>(value: Responsive<T> | T | undefined, device: Device, next: T | undefined): Responsive<T> {
  const out: Responsive<T> = isResponsive<T>(value) ? { ...value } : { desktop: value as T }
  if (device === 'desktop') {
    if (next !== undefined) out.desktop = next
  }
  else if (next !== undefined) out[device] = next
  else if (device === 'tablet') delete out.tablet
  else delete out.mobile

  if (out.tablet !== undefined && deepEqual(out.tablet, out.desktop)) delete out.tablet
  if (out.mobile !== undefined && deepEqual(out.mobile, out.tablet ?? out.desktop)) delete out.mobile
  return out
}

/** Klasy CSS ukrywające blok na urządzeniach, np. ['cms-hide-mobile']. */
export function visibilityClasses(visibility?: Responsive<boolean>): string[] {
  if (!visibility) return []
  return DEVICES.filter(d => resolveResponsive(visibility, d) === false).map(d => `cms-hide-${d}`)
}
