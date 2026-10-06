// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { DeployResponse, StatsResponse } from '../../packages/cms-core/src/index'
import { body, setup } from './support/harness'

const run = (createdAt: string, conclusion = 'success') => ({ status: 'completed', conclusion, created_at: createdAt, html_url: 'https://github.com/owner/repo/actions/runs/1' })

/** Fetch GitHuba z listą uruchomień: ostatnie dowolne i ostatnie udane. */
function githubRuns(last: unknown, success: unknown, status = 200): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input)
    if (!url.startsWith('https://api.github.com/repos/owner/repo/actions/workflows/deploy.yml/runs')) return new Response(null, { status: 404 })
    if (status !== 200) return new Response('{}', { status })
    return Response.json({ workflow_runs: url.includes('status=success') ? (success ? [success] : []) : (last ? [last] : []) })
  }) as typeof fetch
}

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

describe('pulpit: stan wypchnięcia strony', () => {
  it('pokazuje publikacje późniejsze niż ostatnie udane wypchnięcie', async () => {
    const h = setup({ actionsFetch: githubRuns(run('2026-10-06T11:00:00Z', 'failure'), run('2026-10-06T09:00:00Z')) })
    const cookie = await h.login('content_editor')
    const deploy = await body<DeployResponse>(await h.api('GET', '/api/deploy', { cookie }))
    expect(deploy.canTrigger).toBe(false)
    expect(deploy.lastRun).toMatchObject({ conclusion: 'failure', createdAt: '2026-10-06T11:00:00Z' })
    expect(deploy.lastSuccessAt).toBe('2026-10-06T09:00:00Z')
    // Encje z harnessu opublikowano 10:00, po udanym wypchnięciu o 9:00.
    expect(deploy.pending?.map(p => p.id).sort()).toEqual(['cmp_banner', 'global_site', 'page_home', 'tokens'])
    expect(deploy.actionsUrl).toBe('https://github.com/owner/repo/actions/workflows/deploy.yml')
  })

  it('wszystko wypchnięte: pusta lista; GitHub niedostępny: pending = null', async () => {
    const h = setup({ github: true, actionsFetch: githubRuns(run('2026-10-06T10:30:00Z'), run('2026-10-06T10:30:00Z')) })
    const ok = await body<DeployResponse>(await h.api('GET', '/api/deploy', { cookie: await h.login('owner') }))
    expect(ok).toMatchObject({ canTrigger: true, pending: [] })
    const down = setup({ actionsFetch: githubRuns(null, null, 500) })
    const downBody = await body<DeployResponse>(await down.api('GET', '/api/deploy', { cookie: await down.login('owner') }))
    expect(downBody).toMatchObject({ lastRun: null, lastSuccessAt: null, pending: null })
  })
})
