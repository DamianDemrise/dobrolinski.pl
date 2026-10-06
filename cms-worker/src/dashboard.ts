/** Pulpit: anonimowy licznik formularzy strony (stan wypchnięcia: sync.ts). */
import type { FormCounts, StatsResponse } from '../../packages/cms-core/src/index'
import type { Ctx } from './context'
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
