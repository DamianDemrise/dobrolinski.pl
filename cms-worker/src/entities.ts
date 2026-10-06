/**
 * Encje: lista, odczyt, zapis draftu (optimistic concurrency po draft_rev), publikacja,
 * odrzucenie zmian, tworzenie i usuwanie stron (tylko nigdy nieopublikowanych), komponentów i wzorców.
 * Zapis draftu nigdy nie dotyka published_json. Publikacja nie zmienia strony: robi to wypchnięcie (sync.ts).
 */
import type { EntityKind, Permission, PublishResponse, SaveDraftResponse, SiteSchema } from '../../packages/cms-core/src/index'
import { pageSlugProblem } from '../../cms/pages'
import { auditStatement } from './audit'
import { currentUser, nowIso, type Ctx } from './context'
import { randomId } from './crypto'
import { LIMITS } from './env'
import { checkChange, requirePermission, validateOnly } from './guard'
import { fail, json, readJson, readOptionalJson } from './http'
import { toEntity, toSummary, type EntityRow } from './rows'
import { componentUsages } from './usage'

export const ENTITY_KINDS: readonly EntityKind[] = ['page', 'global', 'component', 'pattern', 'tokens']
const CREATABLE: readonly EntityKind[] = ['page', 'component', 'pattern']
const isKind = (value: unknown): value is EntityKind => typeof value === 'string' && (ENTITY_KINDS as readonly string[]).includes(value)

export async function loadEntity(ctx: Ctx, id: string): Promise<EntityRow> {
  const row = await ctx.env.DB.prepare('SELECT * FROM entities WHERE id = ?').bind(id).first<EntityRow>()
  if (!row) throw fail(404, 'not_found')
  return row
}

/** Tytuł na liście: z danych encji, żeby lista nie rozjeżdżała się z treścią. */
export function titleFor(kind: EntityKind, slug: string, data: unknown, schema: SiteSchema, fallback = ''): string {
  const record = (data ?? {}) as Record<string, unknown>
  const pick = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim().slice(0, 200) : ''
  if (kind === 'page') return pick(record.title) || fallback || slug
  if (kind === 'component' || kind === 'pattern') return pick(record.name) || fallback || slug
  if (kind === 'global') return schema.globals[slug]?.label ?? (fallback || slug)
  return fallback || 'Tokeny'
}

function intField(body: Record<string, unknown>, key: string): number {
  const value = body[key]
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) throw fail(400, 'bad_request', { message: key })
  return value
}

const conflict = async (ctx: Ctx, id: string) => fail(409, 'conflict', { entity: toEntity(await loadEntity(ctx, id)) })

/** Rewizja z kolejnym numerem wersji liczonym w tym samym zapytaniu. */
export function revisionStatement(ctx: Ctx, entityId: string, kind: 'checkpoint' | 'publish' | 'restore', dataJson: string) {
  return ctx.env.DB.prepare(
    `INSERT INTO revisions (id, entity_id, version, kind, data_json, created_at, created_by)
     SELECT ?, ?, COALESCE(MAX(version), 0) + 1, ?, ?, ?, ? FROM revisions WHERE entity_id = ?`,
  ).bind(randomId('rev'), entityId, kind, dataJson, nowIso(ctx), currentUser(ctx).id, entityId)
}

export async function listEntities(ctx: Ctx): Promise<Response> {
  const kind = ctx.url.searchParams.get('kind')
  if (kind !== null && !isKind(kind)) throw fail(400, 'bad_request', { message: 'kind' })
  const statement = kind
    ? ctx.env.DB.prepare('SELECT * FROM entities WHERE kind = ? ORDER BY kind, slug').bind(kind)
    : ctx.env.DB.prepare('SELECT * FROM entities ORDER BY kind, slug')
  const { results } = await statement.all<EntityRow>()
  return json({ items: results.map(toSummary) })
}

export async function getEntity(ctx: Ctx): Promise<Response> {
  return json(toEntity(await loadEntity(ctx, ctx.params.id!)))
}

/**
 * Zapis draftu. Kolejność: 409 (nieaktualna wersja) → 403 (brak uprawnień do tej zmiany) → 422.
 * UPDATE ... WHERE draft_rev = baseRev: z dwóch równoczesnych zapisów wygrywa jeden.
 */
export async function saveDraft(ctx: Ctx): Promise<Response> {
  requirePermission(ctx, 'CONTENT_EDIT')
  const body = await readJson(ctx.request)
  const baseRev = intField(body, 'baseRev')
  if (body.data === undefined) throw fail(400, 'bad_request', { message: 'data' })
  const row = await loadEntity(ctx, ctx.params.id!)
  if (row.draft_rev !== baseRev) throw fail(409, 'conflict', { entity: toEntity(row) })
  await checkChange(ctx, row.kind, row.slug, JSON.parse(row.draft_json), body.data)

  const now = ctx.deps.now()
  const updatedAt = nowIso(ctx)
  const checkpoint = row.last_checkpoint_at === null || now - row.last_checkpoint_at >= LIMITS.checkpointMs
  const dataJson = JSON.stringify(body.data)
  const result = await ctx.env.DB.prepare(
    `UPDATE entities SET draft_json = ?, draft_rev = draft_rev + 1, title = ?, updated_at = ?, updated_by = ?, last_checkpoint_at = ?
     WHERE id = ? AND draft_rev = ?`,
  ).bind(
    dataJson, titleFor(row.kind, row.slug, body.data, ctx.deps.schema, row.title), updatedAt, currentUser(ctx).id,
    checkpoint ? now : row.last_checkpoint_at, row.id, baseRev,
  ).run()
  if (result.meta.changes !== 1) throw await conflict(ctx, row.id)
  if (checkpoint) await revisionStatement(ctx, row.id, 'checkpoint', dataJson).run()
  const response: SaveDraftResponse = { draftRev: baseRev + 1, updatedAt }
  return json(response)
}

/** Publikacja tokenów i komponentów wymaga też uprawnienia do ich edycji, nie tylko CONTENT_PUBLISH. */
const PUBLISH_EXTRA: Partial<Record<EntityKind, Permission>> = {
  tokens: 'DESIGN_EDIT',
  component: 'COMPONENT_EDIT',
  pattern: 'COMPONENT_EDIT',
}

/** Strona może wskazywać tylko opublikowane komponenty globalne, inaczej build publiczny by się wywrócił. */
async function assertComponentsPublished(ctx: Ctx, data: unknown): Promise<void> {
  const blocks = (data as { blocks?: unknown })?.blocks
  if (!Array.isArray(blocks)) return
  const refs = [...new Set(blocks
    .filter((block: { type?: unknown, ref?: unknown }) => block?.type === 'global' && typeof block.ref === 'string')
    .map((block: { ref: string }) => block.ref))]
  if (!refs.length) return
  const { results } = await ctx.env.DB.prepare(
    `SELECT id, slug, published_json IS NOT NULL AS published FROM entities WHERE kind = 'component'`,
  ).all<{ id: string, slug: string, published: number }>()
  const unpublished = refs.filter(ref => !results.some(row => (row.id === ref || row.slug === ref) && row.published))
  if (unpublished.length) throw fail(409, 'unpublished_component', { refs: unpublished })
}

export async function publishEntity(ctx: Ctx): Promise<Response> {
  requirePermission(ctx, 'CONTENT_PUBLISH')
  const body = await readJson(ctx.request)
  const expectedRev = intField(body, 'expectedRev')
  const row = await loadEntity(ctx, ctx.params.id!)
  const extra = PUBLISH_EXTRA[row.kind]
  if (extra) requirePermission(ctx, extra)
  if (row.draft_rev !== expectedRev) throw fail(409, 'conflict', { entity: toEntity(row) })
  await validateOnly(ctx, row.kind, row.slug, JSON.parse(row.draft_json))
  if (row.kind === 'page') await assertComponentsPublished(ctx, JSON.parse(row.draft_json))

  const publishedAt = nowIso(ctx)
  const user = currentUser(ctx)
  const result = await ctx.env.DB.prepare(
    'UPDATE entities SET published_json = draft_json, published_at = ?, published_by = ? WHERE id = ? AND draft_rev = ?',
  ).bind(publishedAt, user.id, row.id, expectedRev).run()
  if (result.meta.changes !== 1) throw await conflict(ctx, row.id)
  await ctx.env.DB.batch([
    revisionStatement(ctx, row.id, 'publish', row.draft_json),
    auditStatement(ctx, 'publish', user.id, row.id, { rev: expectedRev }),
  ])
  const response: PublishResponse = { publishedAt }
  return json(response)
}

/** Odrzucenie zmian: draft = published (nowy draft_rev). Też podlega uprawnieniom do zmiany pól. */
export async function discardDraft(ctx: Ctx): Promise<Response> {
  requirePermission(ctx, 'CONTENT_EDIT')
  const body = await readOptionalJson(ctx.request)
  const row = await loadEntity(ctx, ctx.params.id!)
  if (body.expectedRev !== undefined && intField(body, 'expectedRev') !== row.draft_rev) {
    throw fail(409, 'conflict', { entity: toEntity(row) })
  }
  if (row.published_json === null) throw fail(409, 'not_published')
  const published: unknown = JSON.parse(row.published_json)
  await checkChange(ctx, row.kind, row.slug, JSON.parse(row.draft_json), published, false)

  const updatedAt = nowIso(ctx)
  const user = currentUser(ctx)
  const result = await ctx.env.DB.prepare(
    `UPDATE entities SET draft_json = published_json, draft_rev = draft_rev + 1, title = ?, updated_at = ?, updated_by = ?
     WHERE id = ? AND draft_rev = ?`,
  ).bind(titleFor(row.kind, row.slug, published, ctx.deps.schema, row.title), updatedAt, user.id, row.id, row.draft_rev).run()
  if (result.meta.changes !== 1) throw await conflict(ctx, row.id)
  await auditStatement(ctx, 'discard', user.id, row.id).run()
  const response: SaveDraftResponse = { draftRev: row.draft_rev + 1, updatedAt }
  return json(response)
}

const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/

/**
 * Tworzenie i usuwanie: strona to nowy publiczny adres, więc wymaga publikacji i trybu zaawansowanego;
 * komponenty i wzorce (oraz każdy inny rodzaj, odrzucany dalej) wymagają COMPONENT_EDIT.
 */
const lifecyclePermissions = (kind: unknown): Permission[] => kind === 'page' ? ['CONTENT_PUBLISH', 'MODE_ADVANCED'] : ['COMPONENT_EDIT']

/** Slug strony: jeden segment, poza adresami zarezerwowanymi (cms/pages.ts); komponentu i wzorca: SLUG. */
const slugOk = (kind: EntityKind, slug: unknown): slug is string =>
  typeof slug === 'string' && (kind === 'page' ? pageSlugProblem(slug) === null : SLUG.test(slug))

export async function createEntity(ctx: Ctx): Promise<Response> {
  const body = await readJson(ctx.request)
  const kind = body.kind
  requirePermission(ctx, ...lifecyclePermissions(kind))
  if (!isKind(kind) || !CREATABLE.includes(kind)) throw fail(400, 'bad_request', { message: 'kind' })
  const slug = body.slug
  if (!slugOk(kind, slug)) throw fail(400, 'bad_request', { message: 'slug' })
  if (body.title !== undefined && (typeof body.title !== 'string' || body.title.length > 200)) throw fail(400, 'bad_request', { message: 'title' })
  // Strona: poprawny PageDocument (znany layout, slug dokumentu = slug encji, bloki w obszarach layoutu).
  await validateOnly(ctx, kind, slug, body.data)

  const id = kind === 'page' ? `page_${slug}` : randomId(kind === 'component' ? 'cmp' : 'pat')
  const now = nowIso(ctx)
  const user = currentUser(ctx)
  const title = (typeof body.title === 'string' && body.title.trim()) || titleFor(kind, slug, body.data, ctx.deps.schema)
  const result = await ctx.env.DB.prepare(
    `INSERT INTO entities (id, kind, slug, title, draft_json, draft_rev, published_json, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, 1, NULL, ?, ?) ON CONFLICT DO NOTHING`,
  ).bind(id, kind, slug, title, JSON.stringify(body.data), now, user.id).run()
  if (result.meta.changes !== 1) throw fail(409, 'exists')
  await auditStatement(ctx, 'entity_create', user.id, id, { kind, slug }).run()
  return json(toEntity(await loadEntity(ctx, id)), 201)
}

export async function deleteEntity(ctx: Ctx): Promise<Response> {
  const row = await loadEntity(ctx, ctx.params.id!)
  requirePermission(ctx, ...lifecyclePermissions(row.kind))
  if (!CREATABLE.includes(row.kind)) throw fail(400, 'not_deletable')
  // Opublikowana strona jest (albo była) na dobrolinski.pl: usunięcie zostawiłoby martwe linki.
  if (row.kind === 'page' && row.published_json !== null) throw fail(409, 'published')
  if (row.kind === 'component') {
    const usages = await componentUsages(ctx, row)
    if (usages.length) throw fail(409, 'in_use', { usages })
  }
  const user = currentUser(ctx)
  await ctx.env.DB.batch([
    ctx.env.DB.prepare('DELETE FROM entities WHERE id = ?').bind(row.id),
    ctx.env.DB.prepare('DELETE FROM revisions WHERE entity_id = ?').bind(row.id),
    auditStatement(ctx, 'entity_delete', user.id, row.id, { kind: row.kind, slug: row.slug }),
  ])
  return json({ ok: true })
}
