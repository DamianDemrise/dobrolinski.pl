// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { DeployResponse, Entity, PageDocument, PublishedSite, PushResponse } from '../../packages/cms-core/src/index'
import { gitBlobSha, stableJson } from '../src/snapshot'
import { fakeGithub } from './support/github'
import { body, homePage, setup } from './support/harness'

const SNAPSHOT = 'content/published.json'

/** Panel + repo w stanie zgodnym (repo = opublikowana treść panelu). */
async function synced(options: { token?: boolean, before?: (url: string, method: string) => void } = {}) {
  const first = setup()
  const site = await body<PublishedSite>(await first.api('GET', '/api/public/site'))
  const repo = fakeGithub({ [SNAPSHOT]: stableJson(site) })
  const githubFetch: typeof fetch = (input, init) => {
    options.before?.(String(input), init?.method ?? 'GET')
    return repo.fetch(input, init)
  }
  const h = setup({ github: options.token ?? true, githubFetch })
  const owner = await h.login('owner')
  const deploy = () => h.api('GET', '/api/deploy', { cookie: owner }).then(r => body<DeployResponse>(r))
  const publishHome = async (title: string) => {
    const current = await body<Entity>(await h.api('GET', '/api/entities/page_home', { cookie: owner }))
    const doc = homePage()
    doc.blocks[0]!.props.title = title
    await h.api('PUT', '/api/entities/page_home/draft', { cookie: owner, body: { baseRev: current.draftRev, data: doc } })
    return h.api('POST', '/api/entities/page_home/publish', { cookie: owner, body: { expectedRev: current.draftRev + 1 } })
  }
  const repoSite = () => JSON.parse(repo.file(SNAPSHOT)!) as PublishedSite
  const pushEdit = (change: (site: PublishedSite) => void) => {
    const next = repoSite()
    change(next)
    repo.commit(SNAPSHOT, stableJson(next))
  }
  return { h, repo, owner, deploy, publishHome, repoSite, pushEdit }
}

const heroTitle = (page: PageDocument) => page.blocks[0]!.props.title

describe('panel → repo (wypchnięcie)', () => {
  it('pierwszy odczyt ustawia bazę; bez zmian nic do wypchnięcia', async () => {
    const t = await synced()
    const state = await t.deploy()
    expect(state).toMatchObject({ canPush: true, pending: [], conflicts: [] })
    expect((await body<PushResponse>(await t.h.api('POST', '/api/push', { cookie: t.owner })))).toEqual({ status: 'up_to_date' })
  })

  it('publikacja czeka na wypchnięcie; wypchnięcie robi jeden commit z treścią i opisem', async () => {
    const t = await synced()
    await t.deploy()
    await t.publishHome('Nowy tytuł')
    expect((await t.deploy()).pending).toEqual([{ key: 'page:', title: 'Główna', change: 'changed' }])
    expect(heroTitle(t.repoSite().pages['']!)).toBe('Cześć')

    const res = await body<PushResponse>(await t.h.api('POST', '/api/push', { cookie: t.owner }))
    expect(res.status).toBe('pushed')
    expect(heroTitle(t.repoSite().pages['']!)).toBe('Nowy tytuł')
    expect(t.repo.head().message).toBe('CMS: Główna (owner)')
    expect((await t.deploy()).pending).toEqual([])
    // Ping z workflow po tym commicie niczego nie importuje (repo = baza).
    expect(await body(await t.h.api('POST', '/api/sync/pull'))).toEqual({ status: 'up_to_date' })
  })

  it('sha blobu liczone lokalnie zgadza się z GitHubem', async () => {
    const { blobSha } = await import('./support/github')
    const text = stableJson({ ą: 'ż', n: [1, 2] })
    expect(await gitBlobSha(text)).toBe(blobSha(Buffer.from(text)))
  })

  it('bez tokenu: wypchnięcie 503, status nadal działa; content_editor nie wypycha', async () => {
    const t = await synced({ token: false })
    expect((await t.deploy()).canPush).toBe(false)
    expect((await t.h.api('POST', '/api/push', { cookie: t.owner })).status).toBe(503)
    const editor = await t.h.login('content_editor')
    expect((await t.h.api('POST', '/api/push', { cookie: editor })).status).toBe(403)
  })

  it('nowe media trafiają do repo razem z treścią', async () => {
    const t = await synced()
    await t.deploy()
    const png = Uint8Array.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 0x1F, 0x15, 0xC4, 0x89, 0, 0, 0, 0])
    const form = new FormData()
    form.append('file', new File([png], 'foto.png', { type: 'image/png' }))
    const media = await body<{ id: string, url: string }>(await t.h.api('POST', '/api/media', { cookie: t.owner, raw: form }))
    expect(media.url).toMatch(/^\/media\/med_[0-9a-f]{20}\/foto\.png$/)
    const current = await body<Entity>(await t.h.api('GET', '/api/entities/page_home', { cookie: t.owner }))
    const doc = homePage()
    doc.blocks[0]!.props.image = { mediaId: media.id, src: media.url, alt: 'Foto' }
    await t.h.api('PUT', '/api/entities/page_home/draft', { cookie: t.owner, body: { baseRev: current.draftRev, data: doc } })
    await t.h.api('POST', '/api/entities/page_home/publish', { cookie: t.owner, body: { expectedRev: current.draftRev + 1 } })
    expect((await body<PushResponse>(await t.h.api('POST', '/api/push', { cookie: t.owner }))).status).toBe('pushed')
    expect(t.repo.head().files.get(`public${media.url}`)).toEqual(Buffer.from(png))
  })

  it('ktoś pushuje w trakcie wypychania: 409 bez nadpisania, ponowienie działa', async () => {
    let race: (() => void) | null = null
    const t = await synced({ before: (url, method) => {
      if (race && method === 'POST' && url.endsWith('/git/commits')) {
        const run = race
        race = null
        run()
      }
    } })
    await t.deploy()
    await t.publishHome('Wyścig')
    race = () => t.repo.commit('README.md', 'zmiana obok')
    const refused = await t.h.api('POST', '/api/push', { cookie: t.owner })
    expect(refused.status).toBe(409)
    expect(await body(refused)).toMatchObject({ error: 'sync_repo_moved' })
    expect(t.repo.file('README.md')).toBe('zmiana obok')
    expect((await body<PushResponse>(await t.h.api('POST', '/api/push', { cookie: t.owner }))).status).toBe('pushed')
    expect(heroTitle(t.repoSite().pages['']!)).toBe('Wyścig')
    expect(t.repo.file('README.md')).toBe('zmiana obok')
  })
})

describe('repo → panel (import)', () => {
  it('zmiana w repo trafia do panelu jako publikacja i szkic, z rewizją „import”', async () => {
    const t = await synced()
    await t.deploy()
    t.pushEdit((site) => { site.pages['']!.blocks[0]!.props.title = 'Z kodu' })
    expect(await body(await t.h.api('POST', '/api/sync/pull'))).toEqual({ status: 'imported', applied: ['page:'], conflicts: [] })
    const home = await body<Entity<'page'>>(await t.h.api('GET', '/api/entities/page_home', { cookie: t.owner }))
    expect(heroTitle(home.published!)).toBe('Z kodu')
    expect(heroTitle(home.draft)).toBe('Z kodu')
    const revisions = await body<{ items: { kind: string }[] }>(await t.h.api('GET', '/api/entities/page_home/revisions', { cookie: t.owner }))
    expect(revisions.items.map(r => r.kind)).toContain('import')
    expect((await t.deploy()).pending).toEqual([])
  })

  it('nowa strona dodana w repo pojawia się w panelu', async () => {
    const t = await synced()
    await t.deploy()
    t.pushEdit((site) => {
      site.pages.kontakt = { ...homePage(), title: 'Kontakt', slug: 'kontakt', blocks: homePage().blocks.map(b => ({ ...b, id: `k${b.id}` })) }
    })
    await t.h.api('POST', '/api/sync/pull')
    const list = await body<{ items: { id: string, slug: string, status: string }[] }>(await t.h.api('GET', '/api/entities?kind=page', { cookie: t.owner }))
    expect(list.items.find(p => p.slug === 'kontakt')).toMatchObject({ id: 'page_kontakt', status: 'published' })
  })

  it('niezapisany szkic w panelu nie jest nadpisywany; publikacja przyjmuje repo', async () => {
    const t = await synced()
    await t.deploy()
    const doc = homePage()
    doc.blocks[1]!.props.heading = 'Mój szkic'
    await t.h.api('PUT', '/api/entities/page_home/draft', { cookie: t.owner, body: { baseRev: 1, data: doc } })
    t.pushEdit((site) => { site.pages['']!.blocks[0]!.props.title = 'Z kodu' })
    await t.h.api('POST', '/api/sync/pull')
    const home = await body<Entity<'page'>>(await t.h.api('GET', '/api/entities/page_home', { cookie: t.owner }))
    expect(heroTitle(home.published!)).toBe('Z kodu')
    expect(home.draft.blocks[1]!.props.heading).toBe('Mój szkic')
  })

  it('błędna treść w repo nie wchodzi do panelu', async () => {
    const t = await synced()
    await t.deploy()
    t.pushEdit((site) => { site.pages['']!.blocks[0]!.props.title = 'x'.repeat(500) })
    expect(await body(await t.h.api('POST', '/api/sync/pull'))).toMatchObject({ status: 'imported', applied: [] })
    const home = await body<Entity<'page'>>(await t.h.api('GET', '/api/entities/page_home', { cookie: t.owner }))
    expect(heroTitle(home.published!)).toBe('Cześć')
  })

  it('zmiana i w panelu, i w repo = konflikt: wypchnięcie odmawia, rozstrzygnięcie odblokowuje', async () => {
    const t = await synced()
    await t.deploy()
    await t.publishHome('Z panelu')
    t.pushEdit((site) => { site.pages['']!.blocks[0]!.props.title = 'Z kodu' })
    const state = await t.deploy()
    expect(state.conflicts.map(c => c.key)).toEqual(['page:'])
    const refused = await t.h.api('POST', '/api/push', { cookie: t.owner })
    expect(refused.status).toBe(409)
    expect(await body(refused)).toMatchObject({ error: 'sync_conflict' })

    // „Zostaw moją”: wypchnięcie nadpisuje repo wersją z panelu.
    expect((await t.h.api('POST', '/api/sync/resolve', { cookie: t.owner, body: { key: 'page:', choice: 'cms' } })).status).toBe(200)
    expect((await body<PushResponse>(await t.h.api('POST', '/api/push', { cookie: t.owner }))).status).toBe('pushed')
    expect(heroTitle(t.repoSite().pages['']!)).toBe('Z panelu')
  })

  it('konflikt rozstrzygnięty na korzyść repo: panel przyjmuje wersję z kodu', async () => {
    const t = await synced()
    await t.deploy()
    await t.publishHome('Z panelu')
    t.pushEdit((site) => { site.pages['']!.blocks[0]!.props.title = 'Z kodu' })
    await t.deploy()
    await t.h.api('POST', '/api/sync/resolve', { cookie: t.owner, body: { key: 'page:', choice: 'repo' } })
    const home = await body<Entity<'page'>>(await t.h.api('GET', '/api/entities/page_home', { cookie: t.owner }))
    expect(heroTitle(home.published!)).toBe('Z kodu')
    expect((await t.deploy())).toMatchObject({ pending: [], conflicts: [] })
  })

  it('publiczny ping ma limit i nie przyjmuje treści z requestu', async () => {
    const t = await synced()
    await t.deploy()
    const res = await t.h.api('POST', '/api/sync/pull', { body: { pages: { '': { title: 'atak' } } } })
    expect(await body(res)).toEqual({ status: 'up_to_date' })
    for (let i = 0; i < 20; i++) await t.h.api('POST', '/api/sync/pull')
    expect((await t.h.api('POST', '/api/sync/pull')).status).toBe(429)
  })
})
