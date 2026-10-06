/** Wyszukiwanie użyć: komponentów globalnych na stronach i mediów w dowolnej treści. */
import type { MediaUsage } from '../../packages/cms-core/src/index'
import type { Ctx } from './context'

interface UsageRow { id: string, title: string, draft_json: string, published_json: string | null }

function versions(row: UsageRow): [string, unknown][] {
  const list: [string, unknown][] = [['draft', JSON.parse(row.draft_json)]]
  if (row.published_json !== null) list.push(['published', JSON.parse(row.published_json)])
  return list
}

/** Instancje komponentu (block.type === 'global', ref = slug albo id encji) na stronach i we wzorcach. */
export async function componentUsages(ctx: Ctx, component: { id: string, slug: string }): Promise<MediaUsage[]> {
  const { results } = await ctx.env.DB.prepare(
    'SELECT id, title, draft_json, published_json FROM entities WHERE kind IN (\'page\', \'pattern\') AND id != ?',
  ).bind(component.id).all<UsageRow>()
  const usages: MediaUsage[] = []
  for (const row of results) {
    for (const [version, data] of versions(row)) {
      const blocks = (data as { blocks?: unknown })?.blocks
      if (!Array.isArray(blocks)) continue
      blocks.forEach((block: { type?: unknown, ref?: unknown }, index) => {
        if (block?.type === 'global' && (block.ref === component.slug || block.ref === component.id)) {
          usages.push({ entityId: row.id, entityTitle: row.title, path: `${version}.blocks.${index}` })
        }
      })
    }
  }
  return usages
}

function walkMedia(value: unknown, mediaId: string, path: string, found: string[]): void {
  if (typeof value === 'string') {
    if (value.includes(`/media/${mediaId}/`)) found.push(path)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkMedia(item, mediaId, `${path}.${index}`, found))
    return
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (record.mediaId === mediaId) {
      found.push(path)
      return
    }
    for (const [key, child] of Object.entries(record)) walkMedia(child, mediaId, `${path}.${key}`, found)
  }
}

/** Użycia pliku: ImageValue.mediaId albo dowolny tekst z /media/<id>/ (draft i wersja opublikowana). */
export async function mediaUsages(ctx: Ctx, mediaId: string): Promise<MediaUsage[]> {
  const { results } = await ctx.env.DB.prepare(
    'SELECT id, title, draft_json, published_json FROM entities WHERE draft_json LIKE ?1 OR published_json LIKE ?1',
  ).bind(`%${mediaId}%`).all<UsageRow>()
  const usages: MediaUsage[] = []
  for (const row of results) {
    for (const [version, data] of versions(row)) {
      const found: string[] = []
      walkMedia(data, mediaId, version, found)
      for (const path of found) usages.push({ entityId: row.id, entityTitle: row.title, path })
    }
  }
  return usages
}
