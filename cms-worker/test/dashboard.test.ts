// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { StatsResponse } from '../../packages/cms-core/src/index'
import { body, setup } from './support/harness'

describe('pulpit: licznik formularzy', () => {
  it('liczy oferty i ebooki z ostatnich 7 i 30 dni oraz łącznie', async () => {
    const h = setup()
    const insert = h.db.raw.prepare('INSERT INTO form_events (form, created_at) VALUES (?, ?)')
    insert.run('offer', '2026-10-05T10:00:00.000Z') // 1 dzień temu
    insert.run('offer', '2026-09-20T10:00:00.000Z') // 16 dni
    insert.run('offer', '2026-08-01T10:00:00.000Z') // > 30 dni
    insert.run('ebook', '2026-10-06T09:00:00.000Z')
    const cookie = await h.login('content_editor')
    const stats = await body<StatsResponse>(await h.api('GET', '/api/stats', { cookie }))
    expect(stats.forms).toEqual({ offer: { days7: 1, days30: 2, total: 3 }, ebook: { days7: 1, days30: 1, total: 1 } })
  })

  it('bez sesji 401; tabela nie przyjmuje innych formularzy', async () => {
    const h = setup()
    expect((await h.api('GET', '/api/stats')).status).toBe(401)
    expect(() => h.db.raw.prepare('INSERT INTO form_events (form, created_at) VALUES (?, ?)').run('kontakt', 'x')).toThrow()
  })
})
