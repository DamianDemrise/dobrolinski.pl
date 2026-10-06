/** Wspólny kontekst formularza pól (FieldForm → FieldInput → listy/grupy). */
import type { FieldDef, TokensDocument, ValidationIssue } from '@demrise/cms-core'
import type { EditMode } from './editor/protocol'
import { levelAllowed, MODE_LABELS } from './editor/protocol'

export interface FieldContext {
  mode: EditMode
  readonly: boolean
  /** Prefiks id elementów (unikalność, gdy na ekranie jest kilka formularzy). */
  pathPrefix: string
  /** Dodatkowa blokada pola (np. brak SEO_EDIT, pole spoza `exposed`); zwraca powód albo null. */
  lockReason?: (field: FieldDef, path: string) => string | null
  tokens?: TokensDocument
  issues: ValidationIssue[]
  /** Ścieżka pola do pokazania (rozwija elementy list na tej ścieżce). */
  focusPath?: string
}

export const joinPath = (base: string, key: string | number) => (base === '' ? String(key) : `${base}.${key}`)

export function fieldDomId(ctx: FieldContext, path: string): string {
  return `${ctx.pathPrefix || 'fld'}-${path}`.replace(/[^\w-]/g, '-')
}

/** Powód blokady pola albo null, gdy można edytować. */
export function lockFor(ctx: FieldContext, field: FieldDef, path: string): string | null {
  if (!levelAllowed(field.level, ctx.mode)) return `Wymaga trybu ${MODE_LABELS[field.level ?? 'safe']}`
  return ctx.lockReason?.(field, path) ?? null
}

/** Komunikaty walidacji dokładnie dla ścieżki (albo jej podpól, gdy `deep`). */
export function issuesAt(ctx: FieldContext, path: string, deep = false): string[] {
  return ctx.issues
    .filter(i => i.path === path || (deep && i.path.startsWith(`${path}.`)))
    .map(i => i.message)
}
