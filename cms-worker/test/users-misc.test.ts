// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { SECURITY_HEADERS } from '../src/http'
import { body, ORIGIN, setup } from './support/harness'

describe('użytkownicy', () => {
  it('owner tworzy, zmienia i usuwa użytkownika; duplikat 409', async () => {
    const h = setup()
    const cookie = await h.login('owner')
    const res = await h.api('POST', '/api/users', { cookie, body: { email: ' Nowy@Test.pl ', name: 'Nowy', role: 'content_editor' } })
    expect(res.status).toBe(201)
    const user = await body<{ id: string, email: string }>(res)
    expect(user.email).toBe('nowy@test.pl')
    expect((await h.api('POST', '/api/users', { cookie, body: { email: 'nowy@test.pl', name: 'X', role: 'editor' } })).status).toBe(409)
    expect((await h.api('POST', '/api/users', { cookie, body: { email: 'zly', name: 'X', role: 'editor' } })).status).toBe(400)
    expect((await h.api('POST', '/api/users', { cookie, body: { email: 'a@test.pl', name: 'X', role: 'admin' } })).status).toBe(400)
    const patched = await h.api('PATCH', `/api/users/${user.id}`, { cookie, body: { role: 'editor', name: 'Zmieniony' } })
    expect(await body(patched)).toMatchObject({ role: 'editor', name: 'Zmieniony' })
    expect((await h.api('DELETE', `/api/users/${user.id}`, { cookie })).status).toBe(200)
    expect(h.db.raw.prepare('SELECT action FROM audit_log WHERE action LIKE \'user_%\' ORDER BY id').all().map(r => r.action))
      .toEqual(['user_create', 'user_update', 'user_delete'])
  })

  it('ostatni aktywny owner: nie da się go zdegradować, wyłączyć ani usunąć', async () => {
    const h = setup()
    const dev = await h.login('developer')
    expect((await h.api('PATCH', '/api/users/usr_owner', { cookie: dev, body: { role: 'editor' } })).status).toBe(409)
    expect((await h.api('PATCH', '/api/users/usr_owner', { cookie: dev, body: { disabled: true } })).status).toBe(409)
    const del = await h.api('DELETE', '/api/users/usr_owner', { cookie: dev })
    expect(del.status).toBe(409)
    expect(await body(del)).toEqual({ error: 'last_owner' })
    // drugi owner: teraz można
    await h.api('PATCH', '/api/users/usr_editor', { cookie: dev, body: { role: 'owner' } })
    expect((await h.api('PATCH', '/api/users/usr_owner', { cookie: dev, body: { role: 'editor' } })).status).toBe(200)
  })

  it('rolę developer nadaje i odbiera tylko developer; nikt nie zmienia własnej roli', async () => {
    const h = setup()
    const owner = await h.login('owner')
    expect((await h.api('PATCH', '/api/users/usr_editor', { cookie: owner, body: { role: 'developer' } })).status).toBe(403)
    expect((await h.api('PATCH', '/api/users/usr_developer', { cookie: owner, body: { role: 'editor' } })).status).toBe(403)
    expect((await h.api('DELETE', '/api/users/usr_developer', { cookie: owner })).status).toBe(403)
    expect((await h.api('PATCH', '/api/users/usr_developer', { cookie: owner, body: { disabled: true } })).status).toBe(403)
    expect((await h.api('POST', '/api/users', { cookie: owner, body: { email: 'd2@test.pl', name: 'D', role: 'developer' } })).status).toBe(403)
    expect((await h.api('PATCH', '/api/users/usr_owner', { cookie: owner, body: { role: 'editor' } })).status).toBe(403)
    const dev = await h.login('developer')
    expect((await h.api('PATCH', '/api/users/usr_editor', { cookie: dev, body: { role: 'developer' } })).status).toBe(200)
    expect((await h.api('PATCH', '/api/users/usr_developer', { cookie: dev, body: { role: 'owner' } })).status).toBe(403)
  })

  it('wyłączenie użytkownika kończy jego sesje', async () => {
    const h = setup()
    const editor = await h.login('editor')
    expect((await h.api('GET', '/api/me', { cookie: editor })).status).toBe(200)
    const owner = await h.login('owner')
    expect((await h.api('PATCH', '/api/users/usr_editor', { cookie: owner, body: { disabled: true } })).status).toBe(200)
    expect((await h.api('GET', '/api/me', { cookie: editor })).status).toBe(401)
    expect((await h.api('PATCH', '/api/users/usr_owner', { cookie: owner, body: { disabled: true } })).status).toBe(403)
  })
})

describe('publiczne API, nagłówki, routing', () => {
  it('/api/public/site: CORS *, no-store, bez sesji, tylko GET', async () => {
    const h = setup()
    const res = await h.api('GET', '/api/public/site', { cookie: 'whatever=1' })
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(res.headers.get('Set-Cookie')).toBeNull()
    const site = await body<{ pages: object, globals: object, components: object, tokens: object }>(res)
    expect(Object.keys(site.pages)).toEqual([''])
    expect(Object.keys(site.globals)).toEqual(['site'])
    expect(Object.keys(site.components)).toEqual(['cmp_banner'])
    expect((await h.api('POST', '/api/public/site')).status).toBe(405)
  })

  it('nagłówki bezpieczeństwa na API, assetach, przekierowaniu i błędach', async () => {
    const h = setup()
    const responses = [
      await h.api('GET', '/api/public/site'),
      await h.api('GET', '/api/me'),
      await h.api('GET', '/api/nope'),
      await h.app.fetch(new Request(`${ORIGIN}/admin/`), h.env),
      await h.app.fetch(new Request(`${ORIGIN}/`), h.env),
    ]
    for (const res of responses) {
      for (const [name, value] of Object.entries(SECURITY_HEADERS)) expect(res.headers.get(name), name).toBe(value)
    }
    const csp = SECURITY_HEADERS['Content-Security-Policy']!
    expect(csp).toContain('frame-ancestors \'self\'')
    expect(csp).toContain('object-src \'none\'')
  })

  it('/ przekierowuje do /admin/, reszta idzie do assetów, nieznane /api → 404 JSON', async () => {
    const h = setup()
    const root = await h.app.fetch(new Request(`${ORIGIN}/`), h.env)
    expect(root.status).toBe(302)
    expect(root.headers.get('Location')).toBe('/admin/')
    const admin = await h.app.fetch(new Request(`${ORIGIN}/admin/pages/home`), h.env)
    expect(await admin.text()).toContain('<title>admin</title>')
    const unknown = await h.api('GET', '/api/does-not-exist')
    expect(unknown.status).toBe(404)
    expect(unknown.headers.get('Content-Type')).toContain('application/json')
    expect(await body(unknown)).toEqual({ error: 'not_found' })
    expect((await h.api('DELETE', '/api/me')).status).toBe(405)
  })

  it('błąd wewnętrzny: 500 bez stack trace', async () => {
    const h = setup()
    const cookie = await h.login('owner')
    h.db.raw.exec('DROP TABLE media')
    const res = await h.api('GET', '/api/media', { cookie })
    expect(res.status).toBe(500)
    const text = await res.text()
    expect(text).toBe('{"error":"internal"}')
  })
})
