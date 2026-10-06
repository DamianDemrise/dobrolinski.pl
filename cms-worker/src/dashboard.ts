/** Pulpit: anonimowy licznik formularzy strony i stan wypchnięcia strony publicznej. */
import type { DeployResponse, FormCounts, StatsResponse } from '../../packages/cms-core/src/index'
import type { Ctx } from './context'
import { actionsUrl, lastDeployRun, rebuildConfigured } from './github'
import { requirePermission } from './guard'
import { json } from './http'

const DAY_MS = 24 * 60 * 60 * 1000

export async function getStats(ctx: Ctx): Promise<Response> {
  requirePermission(ctx, 'CONTENT_EDIT')
  const now = ctx.deps.now()
  const since7 = new Date(now - 7 * DAY_MS).toISOString()
  const since30 = new Date(now - 30 * DAY_MS).toISOString()
  const { results } = await ctx.env.DB.prepare(
    `SELECT form,
       SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS days7,
       SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS days30,
       COUNT(*) AS total
     FROM form_events GROUP BY form`,
  ).bind(since7, since30).all<{ form: string } & FormCounts>()
  const empty = (): FormCounts => ({ days7: 0, days30: 0, total: 0 })
  const forms: StatsResponse['forms'] = { offer: empty(), ebook: empty() }
  for (const row of results) {
    if (row.form === 'offer' || row.form === 'ebook') forms[row.form] = { days7: Number(row.days7), days30: Number(row.days30), total: Number(row.total) }
  }
  return json({ forms } satisfies StatsResponse)
}

export async function getDeploy(ctx: Ctx): Promise<Response> {
  requirePermission(ctx, 'CONTENT_EDIT')
  const [last, success] = await Promise.all([
    lastDeployRun(ctx.env, ctx.deps.fetch),
    lastDeployRun(ctx.env, ctx.deps.fetch, true),
  ])
  let pending: DeployResponse['pending'] = null
  if (success !== 'error') {
    // Build pobiera treść z API na starcie, więc liczy się czas startu udanego uruchomienia.
    const { results } = await ctx.env.DB.prepare(
      'SELECT id, kind, title, published_at FROM entities WHERE published_at IS NOT NULL AND published_at > ? ORDER BY published_at DESC',
    ).bind(success?.createdAt ?? '').all<{ id: string, kind: string, title: string, published_at: string }>()
    pending = results.map(r => ({ id: r.id, kind: r.kind, title: r.title, publishedAt: r.published_at }))
  }
  const body: DeployResponse = {
    canTrigger: rebuildConfigured(ctx.env),
    lastRun: last === 'error' ? null : last,
    lastSuccessAt: success === 'error' || !success ? null : success.createdAt,
    pending,
    actionsUrl: actionsUrl(ctx.env),
  }
  return json(body)
}
