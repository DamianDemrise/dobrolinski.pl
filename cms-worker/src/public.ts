/** Publiczny snapshot opublikowanej treści dla buildu strony. Nie czyta cookies, tylko `published`. */
import { buildPublishedSite } from '../../packages/cms-core/src/index'
import type { Ctx } from './context'
import { json } from './http'
import { toEntity, type EntityRow } from './rows'

export async function publicSite(ctx: Ctx): Promise<Response> {
  const { results } = await ctx.env.DB.prepare('SELECT * FROM entities WHERE published_json IS NOT NULL ORDER BY kind, slug').all<EntityRow>()
  const site = buildPublishedSite(results.map(toEntity), new Date(ctx.deps.now()))
  return json(site, 200, { 'Access-Control-Allow-Origin': '*' })
}
