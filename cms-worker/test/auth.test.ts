// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { body, ORIGIN, setup } from './support/harness'

describe('logowanie linkiem', () => {
  it('wysyła link istniejącemu użytkownikowi i loguje (cookie z pełnymi flagami)', async () => {
    const h = setup()
    const res = await h.requestLink('  Owner@Test.PL ')
    expect(res.status).toBe(200)
    expect(await body(res)).toEqual({ ok: true })
    const mail = h.net.resend()
    expect(mail).toHaveLength(1)
    expect(mail[0]!.init?.headers).toMatchObject({ Authorization: 'Bearer re_test' })
    expect((mail[0]!.body as { to: string[] }).to).toEqual(['owner@test.pl'])
    const link = h.lastLink()!
    expect(link.startsWith(`${ORIGIN}/api/auth/verify?token=`)).toBe(true)

    const verified = await h.verify(link)
    expect(verified.status).toBe(303)
    expect(verified.headers.get('Location')).toBe('/admin/')
    const cookie = verified.headers.get('Set-Cookie')!
    expect(cookie).toMatch(/^__Host-cms_session=[\w-]{40,};/)
    for (const flag of ['Path=/', 'HttpOnly', 'Secure', 'SameSite=Strict', 'Max-Age=43200']) expect(cookie).toContain(flag)

    const me = await h.api('GET', '/api/me', { cookie: h.cookieFrom(verified) })
    expect(me.status).toBe(200)
    const data = await body<{ user: { email: string, role: string }, permissions: string[] }>(me)
    expect(data.user).toMatchObject({ email: 'owner@test.pl', role: 'owner' })
    expect(data.permissions).toContain('USERS_MANAGE')
    expect(data.permissions).not.toContain('MODE_DEVELOPER')
    expect(h.db.raw.prepare('SELECT COUNT(*) AS n FROM audit_log WHERE action = \'login\'').get()).toEqual({ n: 1 })
  })

  it('baza trzyma tylko skróty tokenu i sesji', async () => {
    const h = setup()
    const cookie = await h.login('owner')
    const sessionId = cookie.split('=')[1]!
    const token = new URL(h.lastLink()!).searchParams.get('token')!
    const dump = JSON.stringify([
      h.db.raw.prepare('SELECT * FROM sessions').all(),
      h.db.raw.prepare('SELECT * FROM login_tokens').all(),
    ])
    expect(dump).not.toContain(sessionId)
    expect(dump).not.toContain(token)
  })

  it('nie zdradza, czy adres istnieje (ta sama odpowiedź, brak maila)', async () => {
    const h = setup()
    const unknown = await h.requestLink('nobody@test.pl')
    const invalid = await h.requestLink('not-an-email')
    expect(unknown.status).toBe(200)
    expect(invalid.status).toBe(200)
    expect(await body(unknown)).toEqual({ ok: true })
    expect(await body(invalid)).toEqual({ ok: true })
    expect(h.net.resend()).toHaveLength(0)
  })

  it('wyłączony użytkownik nie dostaje linku', async () => {
    const h = setup()
    h.db.raw.prepare('UPDATE users SET disabled = 1 WHERE email = ?').run('editor@test.pl')
    expect((await h.requestLink('editor@test.pl')).status).toBe(200)
    expect(h.net.resend()).toHaveLength(0)
  })

  it('token jest jednorazowy', async () => {
    const h = setup()
    await h.requestLink('owner@test.pl')
    const link = h.lastLink()!
    expect((await h.verify(link)).headers.get('Location')).toBe('/admin/')
    const second = await h.verify(link)
    expect(second.status).toBe(302)
    expect(second.headers.get('Location')).toBe('/admin/login?error=link')
    expect(second.headers.get('Set-Cookie')).toBeNull()
  })

  it('token wygasa po 15 minutach', async () => {
    const h = setup()
    await h.requestLink('owner@test.pl')
    h.advance(15 * 60 * 1000 + 1)
    const res = await h.verify(h.lastLink()!)
    expect(res.headers.get('Location')).toBe('/admin/login?error=link')
  })

  it('GET z maila nie zużywa tokenu; POST bez właściwego Origin nie loguje', async () => {
    const h = setup()
    await h.requestLink('owner@test.pl')
    const link = new URL(h.lastLink()!)
    for (let i = 0; i < 3; i++) {
      const page = await h.app.fetch(new Request(`${ORIGIN}${link.pathname}${link.search}`), h.env)
      expect(page.status).toBe(200)
      expect(page.headers.get('Set-Cookie')).toBeNull()
      expect(page.headers.get('Referrer-Policy')).toBe('same-origin')
      expect(await page.text()).toContain('method="post"')
    }
    const foreign = await h.app.fetch(new Request(`${ORIGIN}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Origin': 'https://evil.example' },
      body: `token=${link.searchParams.get('token')}`,
    }), h.env)
    expect(foreign.status).toBe(403)
    expect((await h.verify(link.toString())).headers.get('Location')).toBe('/admin/')
  })

  it('zły token i HEAD na verify nie logują', async () => {
    const h = setup()
    const res = await h.app.fetch(new Request(`${ORIGIN}/api/auth/verify?token=${'a'.repeat(43)}`), h.env)
    expect(res.headers.get('Location')).toBe('/admin/login?error=link')
    await h.requestLink('owner@test.pl')
    const head = await h.app.fetch(new Request(h.lastLink()!, { method: 'HEAD' }), h.env)
    expect(head.status).toBe(405)
    expect((await h.verify(h.lastLink()!)).headers.get('Location')).toBe('/admin/')
  })

  it('limit: 3 linki na adres i 10 próśb na IP w 15 minut, potem dalej 200 bez maila', async () => {
    const h = setup()
    for (let i = 0; i < 5; i++) expect((await h.requestLink('owner@test.pl', `192.0.2.${i}`)).status).toBe(200)
    expect(h.net.resend()).toHaveLength(3)
    h.advance(15 * 60 * 1000)
    await h.requestLink('owner@test.pl', '192.0.2.99')
    expect(h.net.resend()).toHaveLength(4)

    const ip = setup()
    const emails = ['owner@test.pl', 'editor@test.pl', 'content@test.pl', 'dev@test.pl']
    for (let i = 0; i < 12; i++) await ip.requestLink(i < 10 ? `x${i}@test.pl` : emails[i - 10]!, '192.0.2.50')
    expect(ip.net.resend()).toHaveLength(0)
    await ip.requestLink('dev@test.pl', '192.0.2.51')
    expect(ip.net.resend()).toHaveLength(1)
  })

  it('MAIL_MODE=dry nie wysyła maila', async () => {
    const h = setup({ env: { MAIL_MODE: 'dry' } })
    await h.requestLink('owner@test.pl')
    expect(h.net.resend()).toHaveLength(0)
    expect(h.db.raw.prepare('SELECT COUNT(*) AS n FROM login_tokens').get()).toEqual({ n: 1 })
  })

  it('wylogowanie usuwa sesję i czyści cookie', async () => {
    const h = setup()
    const cookie = await h.login('editor')
    const res = await h.api('POST', '/api/auth/logout', { cookie })
    expect(res.status).toBe(200)
    expect(res.headers.get('Set-Cookie')).toContain('Max-Age=0')
    expect((await h.api('GET', '/api/me', { cookie })).status).toBe(401)
  })

  it('sesja wygasa po 12 godzinach (401 session_expired)', async () => {
    const h = setup()
    const cookie = await h.login('editor')
    h.advance(12 * 60 * 60 * 1000 - 1000)
    expect((await h.api('GET', '/api/me', { cookie })).status).toBe(200)
    h.advance(2000)
    const res = await h.api('GET', '/api/me', { cookie })
    expect(res.status).toBe(401)
    expect(await body(res)).toEqual({ error: 'session_expired' })
  })

  it('każde logowanie tworzy nową sesję', async () => {
    const h = setup()
    const a = await h.login('owner')
    const b = await h.login('owner')
    expect(a).not.toBe(b)
    expect(h.db.raw.prepare('SELECT COUNT(*) AS n FROM sessions').get()).toEqual({ n: 2 })
  })

  it('trasy API bez sesji: 401', async () => {
    const h = setup()
    for (const path of ['/api/me', '/api/entities', '/api/media', '/api/users', '/api/settings']) {
      expect((await h.api('GET', path)).status).toBe(401)
    }
    expect((await h.api('GET', '/api/me', { cookie: '__Host-cms_session=forged-session-id-1234567890' })).status).toBe(401)
  })
})

describe('CSRF', () => {
  it('zapis bez nagłówka X-CMS-Request: 403', async () => {
    const h = setup()
    const cookie = await h.login('owner')
    const res = await h.api('POST', '/api/auth/logout', { cookie, headers: { 'X-CMS-Request': '0' } })
    expect(res.status).toBe(403)
    expect(await body(res)).toEqual({ error: 'csrf' })
  })

  it('zły albo brakujący Origin: 403', async () => {
    const h = setup()
    const cookie = await h.login('owner')
    expect((await h.api('POST', '/api/rebuild', { cookie, headers: { Origin: 'https://evil.example' } })).status).toBe(403)
    const noOrigin = await h.app.fetch(new Request(`${ORIGIN}/api/rebuild`, { method: 'POST', headers: { 'Cookie': cookie, 'X-CMS-Request': '1' } }), h.env)
    expect(noOrigin.status).toBe(403)
    expect((await h.api('POST', '/api/rebuild', { cookie, headers: { Origin: 'http://localhost:8787' } })).status).toBe(403)
  })

  it('localhost:8787 tylko przy DEV=1', async () => {
    const h = setup({ env: { DEV: '1' } })
    const cookie = await h.login('owner')
    expect((await h.api('POST', '/api/rebuild', { cookie, headers: { Origin: 'http://localhost:8787' } })).status).toBe(200)
    expect((await h.api('POST', '/api/rebuild', { cookie, headers: { Origin: 'http://127.0.0.1:8787' } })).status).toBe(200)
    expect((await h.api('POST', '/api/rebuild', { cookie, headers: { Origin: 'http://localhost:3000' } })).status).toBe(403)
  })
})
