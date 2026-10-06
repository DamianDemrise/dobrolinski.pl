// @vitest-environment node
/**
 * Agent G (adversarial). Testy, które FAILUJĄ, opisują podatność i oczekują bezpiecznego zachowania.
 * Testy, które przechodzą, dokumentują ataki poprawnie zablokowane.
 */
import { describe, expect, it } from 'vitest'
import type { Entity, MediaItem, PageDocument } from '../../../packages/cms-core/src/index'
import { body, homePage, ORIGIN, setup, type Harness } from '../support/harness'

const u8 = (...parts: (number[] | string)[]) => new Uint8Array(parts.flatMap(p => typeof p === 'string' ? [...p].map(c => c.charCodeAt(0)) : p))
const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]
const png = () => u8([0x89], 'PNG', [0x0D, 0x0A, 0x1A, 0x0A], be32(13), 'IHDR', be32(10), be32(10), [8, 6, 0, 0, 0], [0, 0, 0, 0])

async function entity(h: Harness, cookie: string, id: string): Promise<Entity> {
  return body<Entity>(await h.api('GET', `/api/entities/${id}`, { cookie }))
}

async function save(h: Harness, cookie: string, id: string, data: unknown) {
  const current = await entity(h, cookie, id)
  return h.api('PUT', `/api/entities/${id}/draft`, { cookie, body: { baseRev: current.draftRev, data } })
}

/** Owner tworzy i publikuje komponent hero eksponujący pole developer (customClass) i link (cta). */
async function heroComponent(h: Harness): Promise<string> {
  const dev = await h.login('developer')
  const created = await h.api('POST', '/api/entities', {
    cookie: dev,
    body: { kind: 'component', slug: 'hero-cmp', data: { name: 'Hero', blockType: 'hero', props: { title: 'X', variant: 'dark' }, exposed: ['customClass', 'cta', 'title'] } },
  })
  expect(created.status).toBe(201)
  const cmp = await body<Entity>(created)
  expect((await h.api('POST', `/api/entities/${cmp.id}/publish`, { cookie: dev, body: { expectedRev: cmp.draftRev } })).status).toBe(200)
  return cmp.id
}

function page(change: (doc: PageDocument) => void): PageDocument {
  const doc = homePage()
  change(doc)
  return doc
}

describe('eskalacja uprawnień przez instancje komponentów globalnych', () => {
  it('content_editor nie może ustawić pola developer przez overrides instancji', async () => {
    const h = setup()
    const cmpId = await heroComponent(h)
    const ce = await h.login('content_editor')
    const res = await save(h, ce, 'page_home', page((d) => {
      d.blocks[2] = { id: 'g1', type: 'global', ref: cmpId, props: {}, overrides: { customClass: 'injected' } }
    }))
    expect(res.status).toBe(403)
  })

  it('overrides instancji przechodzą walidację pól (javascript: w linku odrzucony)', async () => {
    const h = setup()
    const cmpId = await heroComponent(h)
    // developer: uprawnienia przechodzą (także maxPerPage bloku hero), więc decyduje walidacja nadpisań
    const dev = await h.login('developer')
    const res = await save(h, dev, 'page_home', page((d) => {
      d.blocks[2] = { id: 'g1', type: 'global', ref: cmpId, props: {}, overrides: { cta: { label: 'x', href: 'javascript:alert(document.domain)' } } }
    }))
    expect(res.status).toBe(422)
  })

  it('content_editor nie może zamienić nieusuwalnego bloku (hero z polem developer) na instancję globalną', async () => {
    const h = setup()
    const dev = await h.login('developer')
    expect((await save(h, dev, 'page_home', page((d) => { d.blocks[0]!.props.customClass = 'dev-only' }))).status).toBe(200)
    const ce = await h.login('content_editor')
    const res = await save(h, ce, 'page_home', page((d) => {
      d.blocks[0] = { id: 'h1', type: 'global', ref: 'cmp_banner', props: {}, overrides: {} }
    }))
    expect(res.status).toBe(403)
  })

  it('content_editor nie może usunąć bloku oznaczonego removable:false', async () => {
    const h = setup()
    const ce = await h.login('content_editor')
    const res = await save(h, ce, 'page_home', page((d) => { d.blocks.splice(0, 1) }))
    expect(res.status).toBe(403)
  })

  it('ref instancji musi wskazywać istniejący komponent (slug zamiast id psuje build publiczny)', async () => {
    const h = setup()
    const owner = await h.login('owner')
    // ref po slugu ('banner' zamiast id 'cmp_banner') jest odrzucany już przy zapisie: /api/public/site kluczuje komponenty po id
    expect((await save(h, owner, 'page_home', page((d) => { (d.blocks[2] as { ref: string }).ref = 'banner' }))).status).toBe(422)
    const e = await entity(h, owner, 'page_home')
    await h.api('POST', '/api/entities/page_home/publish', { cookie: owner, body: { expectedRev: e.draftRev } })
    const site = await body<{ components: Record<string, unknown>, pages: Record<string, PageDocument> }>(
      await h.app.fetch(new Request(`${ORIGIN}/api/public/site`), h.env),
    )
    for (const block of site.pages['']!.blocks) {
      if (block.type === 'global') expect(Object.hasOwn(site.components, block.ref!)).toBe(true)
    }
  })
})

describe('obejście publikacji przez media', () => {
  it('content_editor nie może podmienić pliku użytego w opublikowanej treści (replace bez CONTENT_PUBLISH)', async () => {
    const h = setup()
    const owner = await h.login('owner')
    const form = new FormData()
    form.set('file', new File([png() as BlobPart], 'a.png', { type: 'image/png' }))
    const item = await body<MediaItem>(await h.api('POST', '/api/media', { cookie: owner, raw: form }))
    // owner wstawia obraz do hero i publikuje
    expect((await save(h, owner, 'page_home', page((d) => {
      d.blocks[0]!.props.image = { mediaId: item.id, src: item.url, alt: 'a' }
    }))).status).toBe(200)
    const e = await entity(h, owner, 'page_home')
    expect((await h.api('POST', '/api/entities/page_home/publish', { cookie: owner, body: { expectedRev: e.draftRev } })).status).toBe(200)

    const ce = await h.login('content_editor')
    const evil = new FormData()
    evil.set('file', new File([png() as BlobPart], 'evil.png', { type: 'image/png' }))
    const res = await h.api('POST', `/api/media/${item.id}/replace`, { cookie: ce, raw: evil })
    expect(res.status).toBe(403)
  })
})

describe('użytkownicy: wyścig o ostatniego właściciela', () => {
  it('dwie równoległe degradacje dwóch właścicieli nie zostawiają systemu bez właściciela', async () => {
    const h = setup()
    const owner = await h.login('owner')
    const created = await body<{ id: string }>(await h.api('POST', '/api/users', { cookie: owner, body: { email: 'owner2@test.pl', name: 'O2', role: 'owner' } }))
    const dev = await h.login('developer')
    await Promise.all([
      h.api('PATCH', '/api/users/usr_owner', { cookie: dev, body: { role: 'editor' } }),
      h.api('PATCH', `/api/users/${created.id}`, { cookie: dev, body: { role: 'editor' } }),
    ])
    const n = h.db.raw.prepare('SELECT COUNT(*) AS n FROM users WHERE role = \'owner\' AND disabled = 0').get() as { n: number }
    expect(n.n).toBeGreaterThanOrEqual(1)
  })

  it('[blokowane] owner nie nadaje roli developer, nie zmienia własnej roli, nie usuwa developera', async () => {
    const h = setup()
    const owner = await h.login('owner')
    expect((await h.api('POST', '/api/users', { cookie: owner, body: { email: 'x@test.pl', name: 'X', role: 'developer' } })).status).toBe(403)
    expect((await h.api('PATCH', '/api/users/usr_owner', { cookie: owner, body: { role: 'developer' } })).status).toBe(403)
    expect((await h.api('PATCH', '/api/users/usr_editor', { cookie: owner, body: { role: 'developer' } })).status).toBe(403)
    expect((await h.api('DELETE', '/api/users/usr_developer', { cookie: owner })).status).toBe(403)
    expect((await h.api('PATCH', '/api/users/usr_developer', { cookie: owner, body: { disabled: true } })).status).toBe(403)
    const editor = await h.login('editor')
    expect((await h.api('PATCH', '/api/users/usr_editor', { cookie: editor, body: { role: 'owner' } })).status).toBe(403)
  })
})

describe('[blokowane] publikacja, przywracanie, discard', () => {
  it('content_editor: publish 403, discard zmian developer 403, restore rewizji developer 403', async () => {
    const h = setup()
    const dev = await h.login('developer')
    expect((await save(h, dev, 'page_home', page((d) => { d.blocks[0]!.props.customClass = 'v1' }))).status).toBe(200)
    const ce = await h.login('content_editor')
    const e = await entity(h, ce, 'page_home')
    expect((await h.api('POST', '/api/entities/page_home/publish', { cookie: ce, body: { expectedRev: e.draftRev } })).status).toBe(403)
    // discard cofa customClass → wymaga MODE_DEVELOPER
    expect((await h.api('POST', '/api/entities/page_home/discard', { cookie: ce })).status).toBe(403)
    // restore rewizji checkpoint z customClass na draft bez niego
    expect((await save(h, dev, 'page_home', homePage())).status).toBe(200)
    const revs = await body<{ items: { id: string }[] }>(await h.api('GET', '/api/entities/page_home/revisions', { cookie: ce }))
    const withClass = revs.items.find(r => r)!
    expect((await h.api('POST', `/api/revisions/${withClass.id}/restore`, { cookie: ce })).status).toBe(403)
    const pub = await body<Entity>(await h.api('GET', '/api/entities/page_home', { cookie: ce }))
    expect(JSON.stringify(pub.published)).not.toContain('v1')
  })

  it('editor nie publikuje tokenów ani komponentów', async () => {
    const h = setup()
    const editor = await h.login('editor')
    const t = await entity(h, editor, 'tokens')
    expect((await h.api('POST', '/api/entities/tokens/publish', { cookie: editor, body: { expectedRev: t.draftRev } })).status).toBe(403)
    const c = await entity(h, editor, 'cmp_banner')
    expect((await h.api('POST', '/api/entities/cmp_banner/publish', { cookie: editor, body: { expectedRev: c.draftRev } })).status).toBe(403)
  })

  it('dwa równoległe PUT z tym samym baseRev: wygrywa jeden', async () => {
    const h = setup()
    const owner = await h.login('owner')
    const e = await entity(h, owner, 'page_home')
    const [a, b] = await Promise.all([
      h.api('PUT', '/api/entities/page_home/draft', { cookie: owner, body: { baseRev: e.draftRev, data: page((d) => { d.blocks[0]!.props.title = 'A' }) } }),
      h.api('PUT', '/api/entities/page_home/draft', { cookie: owner, body: { baseRev: e.draftRev, data: page((d) => { d.blocks[0]!.props.title = 'B' }) } }),
    ])
    expect([a.status, b.status].sort()).toEqual([200, 409])
  })

  it('/api/public/site nie zawiera draftów, wzorców, e-maili ani audytu', async () => {
    const h = setup()
    const owner = await h.login('owner')
    await save(h, owner, 'page_home', page((d) => { d.blocks[0]!.props.title = 'SEKRET-DRAFT' }))
    const raw = await (await h.app.fetch(new Request(`${ORIGIN}/api/public/site`), h.env)).text()
    expect(raw).not.toContain('SEKRET-DRAFT')
    expect(raw).not.toContain('@test.pl')
    expect(raw).not.toContain('usr_')
  })
})

describe('[blokowane] CSRF, sesja, metody', () => {
  it('mutacje bez nagłówka, z Origin null, z DEV origin bez DEV=1 → 403', async () => {
    const h = setup()
    const cookie = await h.login('owner')
    expect((await h.api('POST', '/api/auth/logout', { cookie, headers: { 'X-CMS-Request': '0' } })).status).toBe(403)
    expect((await h.api('POST', '/api/auth/logout', { cookie, headers: { Origin: 'null' } })).status).toBe(403)
    expect((await h.api('POST', '/api/auth/logout', { cookie, headers: { Origin: 'http://localhost:8787' } })).status).toBe(403)
    expect((await h.app.fetch(new Request(`${ORIGIN}/api/auth/logout`, { method: 'POST', headers: { 'Cookie': cookie, 'X-CMS-Request': '1' } }), h.env)).status).toBe(403)
    expect((await h.api('OPTIONS', '/api/entities', { cookie })).status).toBe(405)
    expect((await h.api('HEAD', '/api/auth/verify?token=xxxxxxxxxxxxxxxxxxxxxxxx')).status).toBe(405)
  })

  it('login CSRF: POST verify z Origin null albo obcym → 403', async () => {
    const h = setup()
    await h.requestLink('owner@test.pl')
    const token = new URL(h.lastLink()!).searchParams.get('token')!
    for (const origin of ['null', 'https://evil.example']) {
      const res = await h.app.fetch(new Request(`${ORIGIN}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Origin': origin },
        body: new URLSearchParams({ token }).toString(),
      }), h.env)
      expect(res.status).toBe(403)
    }
  })

  it('session fixation: narzucone cookie nie jest akceptowane, logowanie wydaje nowe', async () => {
    const h = setup()
    const fixed = '__Host-cms_session=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
    expect((await h.api('GET', '/api/me', { cookie: fixed })).status).toBe(401)
    const cookie = await h.login('owner')
    expect(cookie).not.toBe(fixed)
  })

  it('token logowania jednorazowy', async () => {
    const h = setup()
    await h.requestLink('owner@test.pl')
    const link = h.lastLink()!
    expect((await h.verify(link)).status).toBe(303)
    expect((await h.verify(link)).status).toBe(302)
  })
})

describe('[blokowane] upload', () => {
  async function up(h: Harness, cookie: string, bytes: Uint8Array, name: string) {
    const form = new FormData()
    form.set('file', new File([bytes as BlobPart], name, { type: 'image/png' }))
    return h.api('POST', '/api/media', { cookie, raw: form })
  }

  it('SVG, pusty plik i HTML → 415; poliglota PNG+script serwowany jako image/png z sandbox', async () => {
    const h = setup()
    const cookie = await h.login('content_editor')
    expect((await up(h, cookie, u8('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), 'a.svg')).status).toBe(415)
    expect((await up(h, cookie, new Uint8Array(0), 'a.png')).status).toBe(415)
    const poly = new Uint8Array([...png(), ...u8('<html><script>alert(1)</script>')])
    const res = await up(h, cookie, poly, '‮gnp.html')
    expect(res.status).toBe(201)
    const item = await body<MediaItem>(res)
    expect(item.filename).toMatch(/^[a-z0-9.-]+\.png$/)
    const file = await h.app.fetch(new Request(`${ORIGIN}${item.url}`), h.env)
    expect(file.headers.get('Content-Type')).toBe('image/png')
    expect(file.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(file.headers.get('Content-Security-Policy')).toContain('sandbox')
  })
})
