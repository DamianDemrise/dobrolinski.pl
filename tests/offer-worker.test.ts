// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { isValidEmail, normalizeEmail, sanitizeSource } from '../shared/offer'
import { handleRequest } from '../offer-worker/src/index'
import type { Env } from '../offer-worker/src/config'
import { memoryKV } from '../offer-worker/scripts/memory-kv'
import { OFFER_SUBJECT, offerHtml, offerText } from '../offer-worker/src/templates'

const ORIGIN = 'https://dobrolinski.pl'
const PDF = 'https://dobrolinski.pl/oferta/poznaj-czlowieka.pdf'

type Call = { url: string, init?: RequestInit }

function setup(options: { mode?: string, provider?: (call: Call) => Response | Promise<Response>, pdf?: number } = {}) {
  let clock = Date.parse('2026-10-05T10:00:00Z')
  const calls: Call[] = []
  const env: Env = {
    OFFER_KV: memoryKV(() => clock),
    RESEND_API_KEY: 're_test_key',
    MAIL_MODE: options.mode ?? 'live',
    TEST_RECIPIENT: 'test@dobrolinski.pl',
    ALLOWED_ORIGINS: ORIGIN,
  }
  const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    calls.push({ url, init })
    if (url === PDF) return new Response(null, { status: options.pdf ?? 200 })
    return options.provider ? options.provider({ url, init }) : new Response('{"id":"x"}', { status: 200 })
  }) as unknown as typeof fetch
  const post = (body: unknown, headers: Record<string, string> = {}) => handleRequest(new Request('https://oferta.example/', {
    method: 'POST',
    headers: { 'Origin': ORIGIN, 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.7', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }), env, fetcher, clock)
  const sends = () => calls.filter(call => call.url.includes('api.resend.com'))
  const sentBody = (index: number) => JSON.parse(String(sends()[index]!.init!.body))
  return { env, post, sends, sentBody, advance: (ms: number) => { clock += ms } }
}

const valid = { email: '  Anna@Firma.PL ', website: '', elapsed: 6000, source: { page: '/poznaj-czlowieka', utm_source: 'linkedin' } }

describe('email validation', () => {
  it('trims, lowercases and accepts practical addresses', () => {
    expect(normalizeEmail('  Anna@Firma.PL ')).toBe('anna@firma.pl')
    for (const ok of ['anna@firma.pl', 'a.b+c@sub.firma.com.pl', 'x_y@f-irma.eu']) expect(isValidEmail(ok)).toBe(true)
  })

  it('rejects empty, malformed and header-injection attempts', () => {
    for (const bad of ['', 'anna', 'anna@', '@firma.pl', 'anna@firma', 'an na@firma.pl', 'a..b@firma.pl',
      'anna@firma.pl\r\nBcc: x@y.pl', 'anna@firma.pl, x@y.pl', '<anna@firma.pl>', `${'a'.repeat(65)}@firma.pl`]) {
      expect(isValidEmail(normalizeEmail(bad))).toBe(false)
    }
  })

  it('keeps only short, safe source values', () => {
    expect(sanitizeSource({ page: '/poznaj-czlowieka', utm_source: 'linkedin', utm_campaign: '<script>', extra: 'x' }))
      .toEqual({ page: '/poznaj-czlowieka', utm_source: 'linkedin' })
    expect(sanitizeSource('nope')).toEqual({})
  })
})

describe('offer endpoint', () => {
  it('sends the fixed offer with PDF attachment and reply-to Damian, then notifies Damian', async () => {
    const t = setup()
    const response = await t.post(valid)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN)
    expect(t.sends()).toHaveLength(2)
    const offer = t.sentBody(0)
    expect(offer.to).toEqual(['anna@firma.pl'])
    expect(offer.reply_to).toBe('damian@dobrolinski.pl')
    expect(offer.subject).toBe(OFFER_SUBJECT)
    expect(offer.attachments).toEqual([{ filename: 'poznaj-czlowieka-damian-dobrolinski.pdf', path: PDF }])
    expect(offer.text).toContain(PDF)
    expect(offer.html).toContain(PDF)
    const notification = t.sentBody(1)
    expect(notification.to).toEqual(['damian@dobrolinski.pl'])
    expect(notification.reply_to).toBe('anna@firma.pl')
    expect(notification.text).toContain('utm_source=linkedin')
  })

  it('ignores client-supplied subject, body, from and attachments (no open relay)', async () => {
    const t = setup()
    await t.post({ ...valid, subject: 'Spam', html: '<b>x</b>', from: 'evil@x.pl', to: 'victim@x.pl', attachments: [{ path: 'https://evil/x.exe' }] })
    const offer = t.sentBody(0)
    expect(offer.subject).toBe(OFFER_SUBJECT)
    expect(offer.from).toBe('Damian Dobroliński <oferta@dobrolinski.pl>')
    expect(offer.to).toEqual(['anna@firma.pl'])
    expect(JSON.stringify(offer)).not.toContain('evil')
  })

  it('rejects invalid and empty email with 400 and sends nothing', async () => {
    const t = setup()
    for (const email of ['', 'nie-mail', 'anna@firma.pl\nBcc: x@y.pl']) {
      const response = await t.post({ ...valid, email })
      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({ ok: false, error: 'invalid_email' })
    }
    expect(t.sends()).toHaveLength(0)
  })

  it('pretends success for honeypot and too-fast submissions without sending', async () => {
    const t = setup()
    expect((await t.post({ ...valid, website: 'https://spam.example' })).status).toBe(200)
    expect((await t.post({ ...valid, elapsed: 300 })).status).toBe(200)
    expect(t.sends()).toHaveLength(0)
  })

  it('sends once for a double click or refresh after success', async () => {
    const t = setup()
    await t.post(valid)
    t.advance(2000)
    const again = await t.post(valid)
    expect(again.status).toBe(200)
    expect(t.sends()).toHaveLength(2)
  })

  it('allows a resend after the cooldown, at most three times a day', async () => {
    const t = setup()
    for (let i = 0; i < 3; i++) {
      await t.post(valid, { 'CF-Connecting-IP': `198.51.100.${i}` })
      t.advance(11 * 60 * 1000)
    }
    const fourth = await t.post(valid, { 'CF-Connecting-IP': '198.51.100.9' })
    expect(fourth.status).toBe(429)
    expect(t.sends()).toHaveLength(6)
  })

  it('rate limits one IP to 5 attempts per hour', async () => {
    const t = setup()
    for (let i = 0; i < 5; i++) expect((await t.post({ ...valid, email: `osoba${i}@firma.pl` })).status).toBe(200)
    const sixth = await t.post({ ...valid, email: 'osoba6@firma.pl' })
    expect(sixth.status).toBe(429)
    expect(await sixth.json()).toEqual({ ok: false, error: 'rate_limited' })
  })

  it('stops at the daily limit', async () => {
    const t = setup()
    t.env.DAILY_LIMIT = '2'
    await t.post({ ...valid, email: 'a@firma.pl' }, { 'CF-Connecting-IP': '1.1.1.1' })
    await t.post({ ...valid, email: 'b@firma.pl' }, { 'CF-Connecting-IP': '1.1.1.2' })
    const third = await t.post({ ...valid, email: 'c@firma.pl' }, { 'CF-Connecting-IP': '1.1.1.3' })
    expect(third.status).toBe(503)
  })

  it('reports unavailable when the PDF is missing, without sending', async () => {
    const t = setup({ pdf: 404 })
    const response = await t.post(valid)
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ ok: false, error: 'unavailable' })
    expect(t.sends()).toHaveLength(0)
  })

  it.each([
    ['provider 4xx', () => new Response('{"message":"invalid"}', { status: 422 }), 502],
    ['provider 5xx', () => new Response('oops', { status: 500 }), 502],
    ['provider 429', () => new Response('slow down', { status: 429 }), 503],
    ['network failure', () => { throw new TypeError('fetch failed') }, 502],
    ['timeout', () => { throw Object.assign(new Error('aborted'), { name: 'AbortError' }) }, 502],
  ])('maps %s to a generic error and allows retry', async (_name, provider, status) => {
    const t = setup({ provider })
    const response = await t.post(valid)
    expect(response.status).toBe(status)
    const body = await response.json()
    expect(body).toEqual({ ok: false, error: 'unavailable' })
    expect(JSON.stringify(body)).not.toMatch(/invalid|oops|fetch failed|422|500/)
  })

  it('does not fail the user when only the notification fails', async () => {
    let n = 0
    const t = setup({ provider: () => (n++ === 0 ? new Response('{}', { status: 200 }) : new Response('x', { status: 500 })) })
    expect((await t.post(valid)).status).toBe(200)
  })

  it('in test mode sends only to the test recipient', async () => {
    const t = setup({ mode: 'test' })
    await t.post(valid)
    expect(t.sentBody(0).to).toEqual(['test@dobrolinski.pl'])
    expect(t.sentBody(0).subject).toMatch(/^\[TEST\] /)
  })

  it('defaults to dry mode: nothing is sent', async () => {
    const t = setup({ mode: '' })
    expect((await t.post(valid)).status).toBe(200)
    expect(t.sends()).toHaveLength(0)
  })

  it('refuses foreign origins, wrong methods and content types', async () => {
    const t = setup()
    expect((await t.post(valid, { Origin: 'https://evil.example' })).status).toBe(403)
    expect((await t.post(valid, { 'Content-Type': 'text/plain' })).status).toBe(415)
    expect((await t.post('x'.repeat(3000))).status).toBe(413)
    expect((await t.post('{nie json')).status).toBe(400)
    expect((await t.post('[]')).status).toBe(400)
    const get = await handleRequest(new Request('https://oferta.example/', { headers: { Origin: ORIGIN } }), t.env)
    expect(get.status).toBe(405)
    const preflight = await handleRequest(new Request('https://oferta.example/', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } }), t.env)
    expect(preflight.headers.get('Access-Control-Allow-Origin')).toBeNull()
    expect(t.sends()).toHaveLength(0)
  })

  it('never puts the recipient address into the offer email', () => {
    expect(offerHtml(PDF)).not.toContain('@firma')
    expect(offerText(PDF)).toContain('Damian Dobroliński')
  })
})
