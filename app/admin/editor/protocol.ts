/**
 * Protokół postMessage między edytorem (rodzic) a canvasem (iframe /admin/frame, ten sam origin).
 * Obie strony sprawdzają event.origin === location.origin oraz źródło (rodzic: iframe.contentWindow,
 * ramka: window.parent). Dane są kopiowane przez JSON (bez reaktywnych proxy Vue).
 */
import type { Device, PageDocument } from '@demrise/cms-core'
import type { CmsSiteData } from '~/cms/context'

export type EditMode = 'safe' | 'advanced' | 'developer'

/** Wskazanie na canvasie: pole bloku albo pole globalu. */
export type CanvasTarget =
  | { kind: 'block', blockId: string, field?: string, globalRef?: string }
  | { kind: 'global', global: string, field: string }

export interface FrameState {
  page: PageDocument
  site: CmsSiteData
  showHidden: boolean
  device: Device
  mode: EditMode
  /** CONTENT_EDIT: wolno edytować tekst na canvasie. */
  canEdit: boolean
  selection: CanvasTarget | null
}

export type ParentMessage =
  | { type: 'cms:state', state: FrameState }
  | { type: 'cms:scroll-to', target: CanvasTarget }

export type FrameMessage =
  | { type: 'cms:ready' }
  | { type: 'cms:select', target: CanvasTarget }
  /** Tekst z edycji na canvasie; commit=false w trakcie pisania (debounce), true przy zatwierdzeniu/anulowaniu. */
  | { type: 'cms:input', target: CanvasTarget, value: string, commit: boolean }
  | { type: 'cms:pick-image', target: CanvasTarget }
  | { type: 'cms:shortcut', action: 'undo' | 'redo' }

const PARENT_TYPES = new Set(['cms:state', 'cms:scroll-to'])
const FRAME_TYPES = new Set(['cms:ready', 'cms:select', 'cms:input', 'cms:pick-image', 'cms:shortcut'])

const hasType = (data: unknown, types: Set<string>): boolean =>
  typeof data === 'object' && data !== null && types.has((data as { type?: unknown }).type as string)

export const isParentMessage = (data: unknown): data is ParentMessage => hasType(data, PARENT_TYPES)
export const isFrameMessage = (data: unknown): data is FrameMessage => hasType(data, FRAME_TYPES)

/** Kopia bez proxy Vue (postMessage nie klonuje reaktywnych obiektów). */
export const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export const sameTarget = (a: CanvasTarget | null | undefined, b: CanvasTarget | null | undefined): boolean => {
  if (!a || !b || a.kind !== b.kind) return false
  if (a.kind === 'global' && b.kind === 'global') return a.global === b.global && a.field === b.field
  if (a.kind === 'block' && b.kind === 'block') return a.blockId === b.blockId && (a.field ?? '') === (b.field ?? '')
  return false
}

export const DEVICE_WIDTHS: Record<Device, number> = { desktop: 1440, tablet: 834, mobile: 390 }
export const DEVICE_HEIGHTS: Record<Device, number> = { desktop: 900, tablet: 1112, mobile: 844 }

const RANK: Record<EditMode, number> = { safe: 0, advanced: 1, developer: 2 }
/** Pole o poziomie `level` jest edytowalne w trybie `mode`. */
export const levelAllowed = (level: EditMode | undefined, mode: EditMode): boolean => RANK[level ?? 'safe'] <= RANK[mode]
export const MODE_LABELS: Record<EditMode, string> = { safe: 'SAFE', advanced: 'ADVANCED', developer: 'DEVELOPER' }
