// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { Entity, PageDocument, Role } from '../../packages/cms-core/src/index'
import { body, homePage, setup, tokens, type Harness } from './support/harness'

async function entity(h: Harness, cookie: string, id: string): Promise<Entity> {
  return body<Entity>(await h.api('GET', `/api/entities/${id}`, { cookie }))
}

function editPage(change: (doc: PageDocument) => void): PageDocument {
  const doc = homePage()
  change(doc)
  return doc
}

const heroProps = (doc: PageDocument) => doc.blocks[0]!.props

async function saveAs(h: Harness, role: Role, id: string, data: unknown) {
  const cookie = await h.login(role)
  const current = await entity(h, cookie, id)
  return h.api('PUT', `/api/entities/${id}/draft`, { cookie, body: { baseRev: current.draftRev, data } })
}

describe('uprawnienia na poziomie pól (bezpośrednio przez API)', () => {
  const cases: { name: string, data: () => unknown, id?: string, allowed: Role[], missing?: string }[] = [
    { name: 'pole safe (tytuł hero)', data: () => editPage(d => { heroProps(d).title = 'Nowy' }), allowed: ['content_editor', 'editor', 'owner', 'developer'] },
    { name: 'pole advanced (wariant)', data: () => editPage(d => { heroProps(d).variant = 'light' }), allowed: ['editor', 'owner', 'developer'], missing: 'MODE_ADVANCED' },
    { name: 'pole developer (klasa)', data: () => editPage(d => { heroProps(d).customClass = 'x' }), allowed: ['developer'], missing: 'MODE_DEVELOPER' },
    { name: 'pole z zakładki seo w bloku', data: () => editPage(d => { heroProps(d).metaNote = 'n' }), allowed: ['editor', 'owner', 'developer'], missing: 'SEO_EDIT' },
    { name: 'SEO strony', data: () => editPage(d => { d.seo.title = 'Nowy title' }), allowed: ['editor', 'owner', 'developer'], missing: 'SEO_EDIT' },
    { name: 'tokeny', id: 'tokens', data: () => ({ ...tokens, colors: { gold: { value: '#000000', label: 'Złoty' } } }), allowed: ['owner', 'developer'], missing: 'DESIGN_EDIT' },
    { name: 'definicja komponentu', id: 'cmp_banner', data: () => ({ name: 'Baner', blockType: 'text', props: { heading: 'Nowy' }, exposed: ['heading'] }), allowed: ['owner', 'developer'], missing: 'COMPONENT_EDIT' },
    { name: 'global: pole developer', id: 'global_site', data: () => ({ phone: '123', analyticsId: 'G-2' }), allowed: ['developer'], missing: 'MODE_DEVELOPER' },
    { name: 'global: pole safe', id: 'global_site', data: () => ({ phone: '999', analyticsId: 'G-1' }), allowed: ['content_editor', 'editor', 'owner', 'developer'] },
  ]
  const roles: Role[] = ['content_editor', 'editor', 'owner', 'developer']
  for (const c of cases) {
    for (const role of roles) {
      const ok = c.allowed.includes(role)
      it(`${c.name}: ${role} → ${ok ? 200 : 403}`, async () => {
        const h = setup()
        const res = await saveAs(h, role, c.id ?? 'page_home', c.data())
        expect(res.status).toBe(ok ? 200 : 403)
        if (!ok) {
          const data = await body<{ error: string, missing: string[] }>(res)
          expect(data.error).toBe('forbidden')
          expect(data.missing).toContain(c.missing)
        }
      })
    }
  }

  it('content_editor nie publikuje, nie zarządza użytkownikami, ustawieniami ani komponentami', async () => {
    const h = setup()
    const cookie = await h.login('content_editor')
    const page = await entity(h, cookie, 'page_home')
    expect((await h.api('POST', '/api/entities/page_home/publish', { cookie, body: { expectedRev: page.draftRev } })).status).toBe(403)
    expect((await h.api('POST', '/api/rebuild', { cookie })).status).toBe(403)
    expect((await h.api('GET', '/api/users', { cookie })).status).toBe(403)
    expect((await h.api('POST', '/api/users', { cookie, body: { email: 'a@b.pl', name: 'A', role: 'owner' } })).status).toBe(403)
    expect((await h.api('GET', '/api/settings', { cookie })).status).toBe(403)
    expect((await h.api('POST', '/api/entities', { cookie, body: { kind: 'component', slug: 'x', data: {} } })).status).toBe(403)
    expect((await h.api('DELETE', '/api/entities/cmp_banner', { cookie })).status).toBe(403)
  })

  it('editor publikuje, ale nie ma ustawień ani użytkowników; owner ma', async () => {
    const h = setup()
    const editor = await h.login('editor')
    expect((await h.api('GET', '/api/settings', { cookie: editor })).status).toBe(403)
    expect((await h.api('GET', '/api/users', { cookie: editor })).status).toBe(403)
    const owner = await h.login('owner')
    const settings = await h.api('GET', '/api/settings', { cookie: owner })
    expect(settings.status).toBe(200)
    expect(await body(settings)).toEqual({ siteUrl: 'https://dobrolinski.pl', rebuild: { configured: false, repo: 'owner/repo' }, mailConfigured: true })
  })
})

describe('draft, konflikty, publikacja', () => {
  it('lista encji ze statusem i seoStatus', async () => {
    const h = setup()
    const cookie = await h.login('editor')
    const res = await body<{ items: { id: string, status: string, seoStatus?: string }[] }>(await h.api('GET', '/api/entities?kind=page', { cookie }))
    expect(res.items).toEqual([expect.objectContaining({ id: 'page_home', status: 'published', seoStatus: 'ok' })])
    expect((await h.api('GET', '/api/entities?kind=bogus', { cookie })).status).toBe(400)
    expect((await h.api('GET', '/api/entities/nope', { cookie })).status).toBe(404)
  })

  it('zapis draftu nie zmienia published, a publiczne API pokazuje tylko published', async () => {
    const h = setup()
    const cookie = await h.login('content_editor')
    const res = await h.api('PUT', '/api/entities/page_home/draft', { cookie, body: { baseRev: 1, data: editPage(d => { heroProps(d).title = 'Szkic' }) } })
    expect(res.status).toBe(200)
    expect(await body(res)).toMatchObject({ draftRev: 2 })
    const e = await entity(h, cookie, 'page_home')
    expect((e.draft as PageDocument).blocks[0]!.props.title).toBe('Szkic')
    expect((e.published as PageDocument).blocks[0]!.props.title).toBe('Cześć')
    const site = await body<{ pages: Record<string, PageDocument> }>(await h.api('GET', '/api/public/site'))
    expect(site.pages['']!.blocks[0]!.props.title).toBe('Cześć')
    expect(h.net.github()).toHaveLength(0)
    const list = await body<{ items: { id: string, status: string }[] }>(await h.api('GET', '/api/entities', { cookie }))
    expect(list.items.find(i => i.id === 'page_home')!.status).toBe('changed')
  })

  it('nieaktualny baseRev: 409 z aktualną encją', async () => {
    const h = setup()
    const cookie = await h.login('editor')
    await h.api('PUT', '/api/entities/page_home/draft', { cookie, body: { baseRev: 1, data: editPage(d => { heroProps(d).title = 'A' }) } })
    const res = await h.api('PUT', '/api/entities/page_home/draft', { cookie, body: { baseRev: 1, data: editPage(d => { heroProps(d).title = 'B' }) } })
    expect(res.status).toBe(409)
    const data = await body<{ error: string, entity: Entity }>(res)
    expect(data.error).toBe('conflict')
    expect(data.entity.draftRev).toBe(2)
    expect((data.entity.draft as PageDocument).blocks[0]!.props.title).toBe('A')
  })

  it('dwa równoczesne zapisy z tym samym baseRev: wygrywa dokładnie jeden', async () => {
    const h = setup()
    const cookie = await h.login('editor')
    const results = await Promise.all(['X', 'Y', 'Z'].map(title =>
      h.api('PUT', '/api/entities/page_home/draft', { cookie, body: { baseRev: 1, data: editPage(d => { heroProps(d).title = title }) } })))
    expect(results.map(r => r.status).sort()).toEqual([200, 409, 409])
    expect((await entity(h, cookie, 'page_home')).draftRev).toBe(2)
  })

  it('walidacja: link javascript: odrzucony (422), zła składnia JSON (400)', async () => {
    const h = setup()
    const cookie = await h.login('developer')
    const res = await h.api('PUT', '/api/entities/page_home/draft', {
      cookie,
      body: { baseRev: 1, data: editPage(d => { heroProps(d).cta = { label: 'Klik', href: 'javascript:alert(1)' } }) },
    })
    expect(res.status).toBe(422)
    const data = await body<{ error: string, issues: { path: string }[] }>(res)
    expect(data.error).toBe('invalid')
    expect(data.issues.some(i => i.path.includes('cta'))).toBe(true)
    const malformed = await h.api('PUT', '/api/entities/page_home/draft', { cookie, raw: '{"baseRev":', headers: { 'Content-Type': 'application/json' } })
    expect(malformed.status).toBe(400)
    const noRev = await h.api('PUT', '/api/entities/page_home/draft', { cookie, body: { data: homePage() } })
    expect(noRev.status).toBe(400)
    const huge = await h.api('PUT', '/api/entities/page_home/draft', { cookie, raw: `{"x":"${'a'.repeat(2 * 1024 * 1024)}"}`, headers: { 'Content-Type': 'application/json' } })
    expect(huge.status).toBe(413)
  })

  it('publikacja wymaga aktualnego expectedRev; bez GITHUB_TOKEN rebuild = manual', async () => {
    const h = setup()
    const cookie = await h.login('editor')
    await h.api('PUT', '/api/entities/page_home/draft', { cookie, body: { baseRev: 1, data: editPage(d => { heroProps(d).title = 'Nowy' }) } })
    expect((await h.api('POST', '/api/entities/page_home/publish', { cookie, body: { expectedRev: 1 } })).status).toBe(409)
    const res = await h.api('POST', '/api/entities/page_home/publish', { cookie, body: { expectedRev: 2 } })
    expect(res.status).toBe(200)
    expect(await body(res)).toMatchObject({ rebuild: 'manual' })
    expect(h.net.github()).toHaveLength(0)
    const site = await body<{ pages: Record<string, PageDocument> }>(await h.api('GET', '/api/public/site'))
    expect(site.pages['']!.blocks[0]!.props.title).toBe('Nowy')
    expect(h.db.raw.prepare('SELECT COUNT(*) AS n FROM audit_log WHERE action = \'publish\'').get()).toEqual({ n: 1 })
  })

  it('z tokenem, ale bez REBUILD_ON_PUBLISH publikacja nie wypycha strony (wypchnięcie ręczne)', async () => {
    const h = setup({ github: true })
    const cookie = await h.login('owner')
    const res = await h.api('POST', '/api/entities/page_home/publish', { cookie, body: { expectedRev: 1 } })
    expect(await body(res)).toMatchObject({ rebuild: 'manual' })
    expect(h.net.github()).toHaveLength(0)
    expect(await body(await h.api('POST', '/api/rebuild', { cookie }))).toEqual({ rebuild: 'triggered' })
  })

  it('z GITHUB_TOKEN i REBUILD_ON_PUBLISH=1 publikacja wyzwala repository_dispatch', async () => {
    const h = setup({ github: true, env: { REBUILD_ON_PUBLISH: '1' } })
    const cookie = await h.login('owner')
    const res = await h.api('POST', '/api/entities/page_home/publish', { cookie, body: { expectedRev: 1 } })
    expect(await body(res)).toMatchObject({ rebuild: 'triggered' })
    const [call] = h.net.github()
    expect(call!.url).toBe('https://api.github.com/repos/owner/repo/dispatches')
    expect(call!.body).toEqual({ event_type: 'cms-publish' })
    expect(call!.init?.headers).toMatchObject({ 'Accept': 'application/vnd.github+json', 'User-Agent': 'demrise-cms', 'Authorization': 'Bearer ghp_test' })
  })

  it('błąd GitHuba: rebuild = failed, publikacja zostaje', async () => {
    const h = setup({ github: true, githubStatus: 500, env: { REBUILD_ON_PUBLISH: '1' } })
    const cookie = await h.login('owner')
    const res = await h.api('POST', '/api/entities/page_home/publish', { cookie, body: { expectedRev: 1 } })
    expect(res.status).toBe(200)
    expect(await body(res)).toMatchObject({ rebuild: 'failed' })
    expect(await body(await h.api('POST', '/api/rebuild', { cookie }))).toEqual({ rebuild: 'failed' })
  })

  it('discard przywraca draft do wersji opublikowanej', async () => {
    const h = setup()
    const cookie = await h.login('editor')
    await h.api('PUT', '/api/entities/page_home/draft', { cookie, body: { baseRev: 1, data: editPage(d => { heroProps(d).title = 'Szkic' }) } })
    const res = await h.api('POST', '/api/entities/page_home/discard', { cookie })
    expect(res.status).toBe(200)
    const e = await entity(h, cookie, 'page_home')
    expect(e.draftRev).toBe(3)
    expect(e.draft).toEqual(e.published)
  })

  it('discard zmian dewelopera wymaga MODE_DEVELOPER', async () => {
    const h = setup()
    expect((await saveAs(h, 'developer', 'page_home', editPage(d => { heroProps(d).customClass = 'x' }))).status).toBe(200)
    const cookie = await h.login('content_editor')
    const res = await h.api('POST', '/api/entities/page_home/discard', { cookie })
    expect(res.status).toBe(403)
  })
})

describe('rewizje', () => {
  it('checkpoint najwyżej co 5 minut, publish i restore tworzą rewizje, historia zostaje', async () => {
    const h = setup()
    const cookie = await h.login('editor')
    const save = async (rev: number, title: string) => h.api('PUT', '/api/entities/page_home/draft', { cookie, body: { baseRev: rev, data: editPage(d => { heroProps(d).title = title }) } })
    await save(1, 'v1')
    await save(2, 'v2')
    h.advance(5 * 60 * 1000)
    await save(3, 'v3')
    await h.api('POST', '/api/entities/page_home/publish', { cookie, body: { expectedRev: 4 } })

    const list = await body<{ items: { id: string, version: number, kind: string }[] }>(await h.api('GET', '/api/entities/page_home/revisions', { cookie }))
    expect(list.items.map(r => r.kind)).toEqual(['publish', 'checkpoint', 'checkpoint'])
    expect(list.items.map(r => r.version)).toEqual([3, 2, 1])

    const first = list.items.at(-1)!
    const rev = await body<{ data: PageDocument }>(await h.api('GET', `/api/revisions/${first.id}`, { cookie }))
    expect(rev.data.blocks[0]!.props.title).toBe('v1')

    const restored = await h.api('POST', `/api/revisions/${first.id}/restore`, { cookie })
    expect(restored.status).toBe(200)
    expect(await body(restored)).toMatchObject({ draftRev: 5 })
    const e = await entity(h, cookie, 'page_home')
    expect((e.draft as PageDocument).blocks[0]!.props.title).toBe('v1')
    expect((e.published as PageDocument).blocks[0]!.props.title).toBe('v3')

    const after = await body<{ items: { kind: string }[] }>(await h.api('GET', '/api/entities/page_home/revisions', { cookie }))
    expect(after.items.map(r => r.kind)).toEqual(['restore', 'publish', 'checkpoint', 'checkpoint'])
    expect(h.db.raw.prepare('SELECT COUNT(*) AS n FROM audit_log WHERE action = \'restore\'').get()).toEqual({ n: 1 })
  })

  it('przywrócenie rewizji ze zmianą pola developer wymaga MODE_DEVELOPER', async () => {
    const h = setup()
    const dev = await h.login('developer')
    await h.api('PUT', '/api/entities/page_home/draft', { cookie: dev, body: { baseRev: 1, data: editPage(d => { heroProps(d).customClass = 'x' }) } })
    await h.api('PUT', '/api/entities/page_home/draft', { cookie: dev, body: { baseRev: 2, data: homePage() } })
    const [checkpoint] = (await body<{ items: { id: string }[] }>(await h.api('GET', '/api/entities/page_home/revisions', { cookie: dev }))).items
    const cookie = await h.login('content_editor')
    const res = await h.api('POST', `/api/revisions/${checkpoint!.id}/restore`, { cookie })
    expect(res.status).toBe(403)
    expect(await body(res)).toMatchObject({ missing: ['MODE_DEVELOPER'] })
  })
})

describe('komponenty i wzorce', () => {
  const component = { name: 'Notka', blockType: 'text', props: { heading: 'N' }, exposed: [] }

  it('tworzenie, duplikat slugu, usuwanie nieużywanego', async () => {
    const h = setup()
    const cookie = await h.login('owner')
    const res = await h.api('POST', '/api/entities', { cookie, body: { kind: 'component', slug: 'notka', title: 'Notka', data: component } })
    expect(res.status).toBe(201)
    const created = await body<Entity>(res)
    expect(created).toMatchObject({ kind: 'component', slug: 'notka', draftRev: 1, published: null })
    expect((await h.api('POST', '/api/entities', { cookie, body: { kind: 'component', slug: 'notka', data: component } })).status).toBe(409)
    expect((await h.api('POST', '/api/entities', { cookie, body: { kind: 'page', slug: 'nowa', data: homePage() } })).status).toBe(400)
    expect((await h.api('POST', '/api/entities', { cookie, body: { kind: 'component', slug: '../x', data: component } })).status).toBe(400)
    expect((await h.api('POST', '/api/entities', { cookie, body: { kind: 'component', slug: 'zly', data: { ...component, blockType: 'nope' } } })).status).toBe(422)
    expect((await h.api('DELETE', `/api/entities/${created.id}`, { cookie })).status).toBe(200)
    expect((await h.api('GET', `/api/entities/${created.id}`, { cookie })).status).toBe(404)
  })

  it('komponent użyty na stronie: 409 z listą użyć; strony, globale i tokeny nieusuwalne', async () => {
    const h = setup()
    const cookie = await h.login('developer')
    const res = await h.api('DELETE', '/api/entities/cmp_banner', { cookie })
    expect(res.status).toBe(409)
    const data = await body<{ error: string, usages: { entityId: string, path: string }[] }>(res)
    expect(data.error).toBe('in_use')
    expect(data.usages).toEqual(expect.arrayContaining([
      expect.objectContaining({ entityId: 'page_home', path: 'draft.blocks.2' }),
      expect.objectContaining({ entityId: 'page_home', path: 'published.blocks.2' }),
    ]))
    for (const id of ['page_home', 'global_site', 'tokens']) expect((await h.api('DELETE', `/api/entities/${id}`, { cookie })).status).toBe(400)
  })

  it('publikacja tokenów i komponentów wymaga uprawnień do ich edycji', async () => {
    const h = setup()
    const editor = await h.login('editor')
    for (const id of ['tokens', 'cmp_banner']) {
      const entity = await body<Entity>(await h.api('GET', `/api/entities/${id}`, { cookie: editor }))
      const res = await h.api('POST', `/api/entities/${id}/publish`, { cookie: editor, body: { expectedRev: entity.draftRev } })
      expect(res.status).toBe(403)
    }
    const owner = await h.login('owner')
    const tokensEntity = await body<Entity>(await h.api('GET', '/api/entities/tokens', { cookie: owner }))
    expect((await h.api('POST', '/api/entities/tokens/publish', { cookie: owner, body: { expectedRev: tokensEntity.draftRev } })).status).toBe(200)
  })

  it('strona z nieopublikowanym komponentem globalnym nie może zostać opublikowana', async () => {
    const h = setup()
    const cookie = await h.login('owner')
    const created = await body<Entity>(await h.api('POST', '/api/entities', { cookie, body: { kind: 'component', slug: 'nowy', title: 'Nowy', data: component } }))
    const page = await body<Entity<'page'>>(await h.api('GET', '/api/entities/page_home', { cookie }))
    const data = { ...page.draft, blocks: [...page.draft.blocks, { id: 'g2', type: 'global', ref: created.id, props: {}, overrides: {} }] }
    const saved = await body<{ draftRev: number }>(await h.api('PUT', '/api/entities/page_home/draft', { cookie, body: { baseRev: page.draftRev, data } }))
    const blocked = await h.api('POST', '/api/entities/page_home/publish', { cookie, body: { expectedRev: saved.draftRev } })
    expect(blocked.status).toBe(409)
    expect(await body<{ error: string, refs: string[] }>(blocked)).toMatchObject({ error: 'unpublished_component', refs: [created.id] })
    expect((await h.api('POST', `/api/entities/${created.id}/publish`, { cookie, body: { expectedRev: 1 } })).status).toBe(200)
    expect((await h.api('POST', '/api/entities/page_home/publish', { cookie, body: { expectedRev: saved.draftRev } })).status).toBe(200)
  })
})
