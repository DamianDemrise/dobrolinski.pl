/** Rewizje: lista, odczyt i przywrócenie (kopia do draftu + nowa rewizja 'restore', historia zostaje). */
import type { SaveDraftResponse } from '../../packages/cms-core/src/index'
import { auditStatement } from './audit'
import { currentUser, nowIso, type Ctx } from './context'
import { loadEntity, revisionStatement, titleFor } from './entities'
import { checkChange, requirePermission } from './guard'
import { fail, json, readOptionalJson } from './http'
import { toEntity, toRevision, toRevisionSummary, type RevisionRow } from './rows'

async function loadRevision(ctx: Ctx, id: string): Promise<RevisionRow> {
  const row = await ctx.env.DB.prepare('SELECT * FROM revisions WHERE id = ?').bind(id).first<RevisionRow>()
  if (!row) throw fail(404, 'not_found')
  return row
}

export async function listRevisions(ctx: Ctx): Promise<Response> {
  const entity = await loadEntity(ctx, ctx.params.id!)
  const { results } = await ctx.env.DB.prepare(
    'SELECT id, entity_id, version, kind, created_at, created_by FROM revisions WHERE entity_id = ? ORDER BY version DESC LIMIT 200',
  ).bind(entity.id).all<Omit<RevisionRow, 'data_json'>>()
  return json({ items: results.map(toRevisionSummary) })
}

export async function getRevision(ctx: Ctx): Promise<Response> {
  return json(toRevision(await loadRevision(ctx, ctx.params.rid!)))
}

export async function restoreRevision(ctx: Ctx): Promise<Response> {
  requirePermission(ctx, 'CONTENT_EDIT')
  const body = await readOptionalJson(ctx.request)
  const revision = await loadRevision(ctx, ctx.params.rid!)
  const row = await loadEntity(ctx, revision.entity_id)
  if (body.baseRev !== undefined && body.baseRev !== row.draft_rev) throw fail(409, 'conflict', { entity: toEntity(row) })
  const data: unknown = JSON.parse(revision.data_json)
  await checkChange(ctx, row.kind, row.slug, JSON.parse(row.draft_json), data)

  const user = currentUser(ctx)
  const updatedAt = nowIso(ctx)
  const result = await ctx.env.DB.prepare(
    `UPDATE entities SET draft_json = ?, draft_rev = draft_rev + 1, title = ?, updated_at = ?, updated_by = ?
     WHERE id = ? AND draft_rev = ?`,
  ).bind(revision.data_json, titleFor(row.kind, row.slug, data, ctx.deps.schema, row.title), updatedAt, user.id, row.id, row.draft_rev).run()
  if (result.meta.changes !== 1) throw fail(409, 'conflict', { entity: toEntity(await loadEntity(ctx, row.id)) })
  await ctx.env.DB.batch([
    revisionStatement(ctx, row.id, 'restore', revision.data_json),
    auditStatement(ctx, 'restore', user.id, row.id, { revision: revision.id, version: revision.version }),
  ])
  const response: SaveDraftResponse = { draftRev: row.draft_rev + 1, updatedAt }
  return json(response)
}
