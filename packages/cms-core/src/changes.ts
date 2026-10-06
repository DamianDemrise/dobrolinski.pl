/** Uprawnienia wymagane do zmiany danych encji (porównanie przed/po). */
import { addBlocksPerms, addDiffPerms } from './changes-blocks'
import type { Components, Need } from './changes-blocks'
import { deepEqual } from './diff'
import { PERMISSIONS } from './permissions'
import type { Permission } from './permissions'
import type { EntityKind, FieldDef, SiteSchema } from './types'
import { isPlainObject } from './util'

export interface ChangeContext {
  /** Klucz globalu (wskazuje definicję pól w schema.globals). */
  slug?: string
  /** Komponenty globalne po id encji; bez nich każda zmiana ref/overrides instancji wymaga MODE_DEVELOPER. */
  components?: Components
}

function addPagePerms(need: Need, before: unknown, after: unknown, schema: SiteSchema, components?: Components): void {
  const b = isPlainObject(before) ? before : {}
  const a = isPlainObject(after) ? after : {}
  for (const key of new Set([...Object.keys(b), ...Object.keys(a)])) {
    if (deepEqual(b[key], a[key])) continue
    if (key === 'title') need.add('CONTENT_EDIT')
    else if (key === 'slug' || key === 'layout') need.add('MODE_DEVELOPER')
    else if (key === 'seo') {
      need.add('SEO_EDIT')
      addDiffPerms(need, schema.seoFields, b[key], a[key])
    }
    else if (key === 'blocks') addBlocksPerms(need, b[key], a[key], schema, components)
    else need.add('MODE_DEVELOPER')
  }
}

/** Definicja globalu: z ctx.slug, a bez niego jedyny global, którego pola obejmują wszystkie klucze. */
function globalFields(schema: SiteSchema, before: unknown, after: unknown, slug?: string): FieldDef[] | undefined {
  if (slug !== undefined) return Object.hasOwn(schema.globals, slug) ? schema.globals[slug]!.fields : undefined
  const keys = new Set([...Object.keys(isPlainObject(before) ? before : {}), ...Object.keys(isPlainObject(after) ? after : {})])
  const matches = Object.values(schema.globals).filter(g => [...keys].every(k => g.fields.some(f => f.key === k)))
  return matches.length === 1 ? matches[0]!.fields : undefined
}

/**
 * Uprawnienia potrzebne do zamiany `before` na `after`. Brak zmian = [].
 * `ctx.slug` wskazuje definicję globalu; `ctx.components` pozwala ocenić instancje komponentów na stronie.
 */
export function requiredPermissions(kind: EntityKind, before: unknown, after: unknown, schema: SiteSchema, ctx?: ChangeContext): Permission[] {
  if (deepEqual(before, after)) return []
  const need: Need = new Set()
  switch (kind) {
    case 'page':
      addPagePerms(need, before, after, schema, ctx?.components)
      break
    case 'global': {
      need.add('CONTENT_EDIT')
      const fields = globalFields(schema, before, after, ctx?.slug)
      if (fields) addDiffPerms(need, fields, before, after)
      else need.add('MODE_DEVELOPER')
      break
    }
    case 'tokens':
      need.add('DESIGN_EDIT')
      break
    case 'component':
    case 'pattern':
      need.add('COMPONENT_EDIT')
      break
    default:
      need.add('MODE_DEVELOPER')
  }
  return PERMISSIONS.filter(p => need.has(p))
}
