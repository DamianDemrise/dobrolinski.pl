// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { validateEntityData, type EntityKind } from '../../packages/cms-core/src/index'
import { siteSchema } from '../../cms/schema'
import { createApp } from '../src/app'
import { createD1, memoryKV } from './support/d1'

const seedFile = join(import.meta.dirname, '../migrations/0002_seed.sql')
const publishedFile = join(import.meta.dirname, '../../content/published.json')

describe.skipIf(!existsSync(seedFile) || !existsSync(publishedFile))('seed z content/published.json', () => {
  it('jest idempotentny, dane przechodzą walidację prawdziwego schematu, a /api/public/site odtwarza snapshot', async () => {
    const db = createD1()
    const sql = readFileSync(seedFile, 'utf8')
    db.raw.exec(sql)
    db.raw.exec(sql)
    const rows = db.raw.prepare('SELECT id, kind, slug, draft_json, published_json, draft_rev FROM entities').all() as
      { id: string, kind: EntityKind, slug: string, draft_json: string, published_json: string, draft_rev: number }[]
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row.draft_json).toBe(row.published_json)
      expect(row.draft_rev).toBe(1)
      expect(validateEntityData(row.kind, JSON.parse(row.draft_json), siteSchema, { slug: row.slug }), row.id).toEqual([])
    }
    expect(db.raw.prepare('SELECT COUNT(*) AS n FROM revisions').get()).toEqual({ n: rows.length })
    expect(db.raw.prepare('SELECT email, role FROM users ORDER BY email').all()).toEqual([
      { email: 'damian@demrise.pl', role: 'developer' },
      { email: 'damian@dobrolinski.pl', role: 'owner' },
    ])

    const app = createApp({ schema: siteSchema })
    const res = await app.fetch(new Request('https://cms.test/api/public/site'), { DB: db, MEDIA: memoryKV() })
    const site = await res.json() as Record<string, unknown>
    const published = JSON.parse(readFileSync(publishedFile, 'utf8')) as Record<string, unknown>
    for (const key of ['pages', 'globals', 'components', 'tokens']) expect(site[key], key).toEqual(published[key])
  })
})
