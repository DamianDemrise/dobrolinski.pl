// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { Entity, PageDocument, Role } from '../../packages/cms-core/src/index'
import { RESERVED_PAGE_SLUGS } from '../../cms/pages'
import { body, setup } from './support/harness'

/** Nowa strona w układzie fixture 'landing' (tylko obszar main). */
function landing(slug: string, change: (doc: PageDocument) => void = () => {}): PageDocument {
  const doc: PageDocument = {
    title: 'Nowa strona',
    slug,
    layout: 'landing',
    seo: { title: 'Nowa strona | Test', description: '', canonical: `https://dobrolinski.pl/${slug}`, ogTitle: '', ogDescription: '', ogImage: '', noindex: false },
    blocks: [
      { id: 'b_1', type: 'text', props: { heading: 'Cześć' } },
      { id: 'b_2', type: 'global', ref: 'cmp_banner', props: {}, overrides: {} },
    ],
  }
  change(doc)
  return doc
}

const create = (h: ReturnType<typeof setup>, cookie: string, slug: string, data: unknown = landing(slug)) =>
  h.api('POST', '/api/entities', { cookie, body: { kind: 'page', slug, data } })

describe('nowe strony: tworzenie', () => {
  it('owner tworzy stronę: id page_<slug>, szkic bez publikacji, tytuł z dokumentu', async () => {
    const h = setup()
    const cookie = await h.login('owner')
    const res = await create(h, cookie, 'nowa-strona')
    expect(res.status).toBe(201)
    expect(await body<Entity>(res)).toMatchObject({ id: 'page_nowa-strona', kind: 'page', slug: 'nowa-strona', title: 'Nowa strona', draftRev: 1, published: null })
    const list = await body<{ items: { id: string, status: string }[] }>(await h.api('GET', '/api/entities?kind=page', { cookie }))
    expect(list.items).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'page_nowa-strona', status: 'draft' })]))
  })

  const roles: [Role, number][] = [['content_editor', 403], ['editor', 201], ['owner', 201], ['developer', 201]]
  for (const [role, status] of roles) {
    it(`uprawnienia: ${role} → ${status}`, async () => {
      const h = setup()
      const cookie = await h.login(role)
      const res = await create(h, cookie, 'strona-roli')
      expect(res.status).toBe(status)
      if (status === 403) expect((await body<{ missing: string[] }>(res)).missing).toEqual(['CONTENT_PUBLISH', 'MODE_ADVANCED'])
    })
  }

  it('komponent nadal wymaga COMPONENT_EDIT (editor może stronę, ale nie komponent)', async () => {
    const h = setup()
    const cookie = await h.login('editor')
    const component = { name: 'X', blockType: 'text', props: {}, exposed: [] }
    const res = await h.api('POST', '/api/entities', { cookie, body: { kind: 'component', slug: 'x', data: component } })
    expect(res.status).toBe(403)
    expect((await body<{ missing: string[] }>(res)).missing).toEqual(['COMPONENT_EDIT'])
  })

  it('zły slug: pusty, kilka segmentów, wielkie litery, podwójny myślnik, za długi, zarezerwowany → 400', async () => {
    const h = setup()
    const cookie = await h.login('owner')
    const bad = ['', 'a/b', 'Nowa', 'a--b', '-a', 'a-', 'ą', 'a'.repeat(65), ...RESERVED_PAGE_SLUGS]
    for (const slug of bad) {
      const res = await create(h, cookie, slug)
      expect(res.status, slug).toBe(400)
      expect(await body(res)).toMatchObject({ error: 'bad_request', message: 'slug' })
    }
    expect((await create(h, cookie, 'a'.repeat(64))).status).toBe(201)
  })

  it('duplikat slugu strony → 409 exists', async () => {
    const h = setup()
    const cookie = await h.login('owner')
    expect((await create(h, cookie, 'kopia')).status).toBe(201)
    const again = await create(h, cookie, 'kopia')
    expect(again.status).toBe(409)
    expect((await body(again)).error).toBe('exists')
  })

  it('dokument musi być poprawną stroną: znany layout, slug = slug encji, bloki w obszarach layoutu', async () => {
    const h = setup()
    const cookie = await h.login('owner')
    const cases: PageDocument[] = [
      landing('x1', d => { d.layout = 'nieznany' }),
      landing('inny'),
      landing('x3', d => { d.blocks.unshift({ id: 'h', type: 'hero', props: { title: 'H' } }) }),
      landing('x4', d => { d.title = '' }),
    ]
    for (const [i, data] of cases.entries()) {
      const slug = i === 1 ? 'x2' : data.slug
      const res = await create(h, cookie, slug, data)
      expect(res.status, slug).toBe(422)
    }
    // layout z fixture 'home' też jest dozwolony
    const home = landing('glowna-2', d => { d.layout = 'home'; d.blocks.unshift({ id: 'h', type: 'hero', props: { title: 'H', variant: 'dark' } }) })
    expect((await create(h, cookie, 'glowna-2', home)).status).toBe(201)
  })
})

describe('nowe strony: usuwanie', () => {
  it('nigdy nieopublikowaną stronę owner usuwa (z rewizjami); po publikacji → 409 published', async () => {
    const h = setup()
    const cookie = await h.login('owner')
    const created = await body<Entity>(await create(h, cookie, 'do-usuniecia'))
    expect((await h.api('DELETE', `/api/entities/${created.id}`, { cookie })).status).toBe(200)
    expect((await h.api('GET', `/api/entities/${created.id}`, { cookie })).status).toBe(404)
    expect(h.db.raw.prepare('SELECT COUNT(*) AS n FROM revisions WHERE entity_id = ?').get(created.id)).toEqual({ n: 0 })

    const kept = await body<Entity>(await create(h, cookie, 'opublikowana'))
    expect((await h.api('POST', `/api/entities/${kept.id}/publish`, { cookie, body: { expectedRev: 1 } })).status).toBe(200)
    const res = await h.api('DELETE', `/api/entities/${kept.id}`, { cookie })
    expect(res.status).toBe(409)
    expect((await body(res)).error).toBe('published')
  })

  it('usuwanie strony: te same uprawnienia co tworzenie', async () => {
    const h = setup()
    const owner = await h.login('owner')
    const created = await body<Entity>(await create(h, owner, 'cudza'))
    const content = await h.login('content_editor')
    expect((await h.api('DELETE', `/api/entities/${created.id}`, { cookie: content })).status).toBe(403)
    const editor = await h.login('editor')
    expect((await h.api('DELETE', `/api/entities/${created.id}`, { cookie: editor })).status).toBe(200)
  })
})
