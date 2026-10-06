/** Sprawdzanie uprawnień i zmian w treści (poziomy pól, SEO, tokeny) przez rdzeń. */
import { requiredPermissions, validateEntityData, type ComponentDocument, type EntityKind, type Permission } from '../../packages/cms-core/src/index'
import { currentUser, type Ctx } from './context'
import { fail } from './http'

export function requirePermission(ctx: Ctx, ...permissions: Permission[]): void {
  const held = currentUser(ctx).permissions
  const missing = permissions.filter(p => !held.includes(p))
  if (missing.length) throw fail(403, 'forbidden', { missing })
}

/**
 * Definicje komponentów globalnych (wersja robocza, klucz = id encji): bez nich rdzeń nie umie
 * sprawdzić nadpisań instancji, więc każda zmiana instancji wymagałaby MODE_DEVELOPER.
 */
async function componentsFor(ctx: Ctx, kind: EntityKind): Promise<Record<string, ComponentDocument> | undefined> {
  if (kind !== 'page' && kind !== 'pattern') return undefined
  const { results } = await ctx.env.DB.prepare('SELECT id, draft_json FROM entities WHERE kind = \'component\'').all<{ id: string, draft_json: string }>()
  return Object.fromEntries(results.map(row => [row.id, JSON.parse(row.draft_json) as ComponentDocument]))
}

/** Zmiana danych encji: każde uprawnienie wskazane przez rdzeń musi być posiadane, a dane poprawne. */
export async function checkChange(ctx: Ctx, kind: EntityKind, slug: string, before: unknown, after: unknown, validate = true): Promise<void> {
  const { schema } = ctx.deps
  const components = await componentsFor(ctx, kind)
  requirePermission(ctx, ...requiredPermissions(kind, before, after, schema, { slug, components }))
  if (!validate) return
  const issues = validateEntityData(kind, after, schema, { slug, components })
  if (issues.length) throw fail(422, 'invalid', { issues })
}

export async function validateOnly(ctx: Ctx, kind: EntityKind, slug: string, data: unknown): Promise<void> {
  const issues = validateEntityData(kind, data, ctx.deps.schema, { slug, components: await componentsFor(ctx, kind) })
  if (issues.length) throw fail(422, 'invalid', { issues })
}
