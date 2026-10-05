/**
 * Endpoint oferty POZNAJ CZŁOWIEKA (Cloudflare Worker).
 * Przyjmuje tylko adres e-mail i wysyła na niego jeden stały szablon
 * ze stałym PDF-em. Nie jest przekaźnikiem poczty: temat, treść, nadawca
 * i załącznik są ustalone tutaj, nie w requeście.
 */
import { isValidEmail, normalizeEmail, sanitizeSource, type OfferErrorCode, type OfferResponse } from '../../shared/offer.ts'
import { allowedOrigins, DEFAULTS, LIMITS, mailMode, type Env } from './config.ts'
import { allowIp, checkEmail, countDaily, rememberEmail, sha256, underDailyLimit } from './limits.ts'
import { sendMail, type OutgoingMail } from './resend.ts'
import { NOTIFICATION_SUBJECT, notificationText, OFFER_ATTACHMENT, OFFER_SUBJECT, offerHtml, offerText } from './templates.ts'

type LogStatus = 'sent' | 'dry' | 'duplicate' | 'bot' | 'rejected' | 'error'

/** Log bez adresu e-mail i bez treści maila. */
function log(status: LogStatus, detail?: string) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), status, ...(detail ? { detail } : {}) }))
}

function corsHeaders(origin: string | null, env: Env): Record<string, string> {
  const headers: Record<string, string> = { Vary: 'Origin' }
  if (origin && allowedOrigins(env).includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
    headers['Access-Control-Allow-Headers'] = 'Content-Type'
    headers['Access-Control-Max-Age'] = '86400'
  }
  return headers
}

function reply(body: OfferResponse, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

const fail = (error: OfferErrorCode, status: number, cors: Record<string, string>) =>
  reply({ ok: false, error }, status, cors)

async function pdfAvailable(url: string, fetcher: typeof fetch): Promise<boolean> {
  try {
    const response = await fetcher(url, { method: 'HEAD', signal: AbortSignal.timeout(LIMITS.providerTimeoutMs) })
    return response.ok
  }
  catch {
    return false
  }
}

export async function handleRequest(request: Request, env: Env, fetcher: typeof fetch = fetch, now = Date.now()): Promise<Response> {
  const origin = request.headers.get('Origin')
  const cors = corsHeaders(origin, env)
  const originAllowed = Boolean(origin && allowedOrigins(env).includes(origin))

  if (request.method === 'OPTIONS') return new Response(null, { status: originAllowed ? 204 : 403, headers: cors })
  if (request.method !== 'POST') return fail('bad_request', 405, cors)
  // Origin sprawdzamy też po stronie serwera: CORS chroni tylko przeglądarki.
  if (!originAllowed) {
    log('rejected', 'origin')
    return fail('bad_request', 403, cors)
  }
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return fail('bad_request', 415, cors)

  const raw = await request.text()
  if (new TextEncoder().encode(raw).length > LIMITS.bodyBytes) return fail('bad_request', 413, cors)
  let body: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object')
    body = parsed as Record<string, unknown>
  }
  catch {
    return fail('bad_request', 400, cors)
  }

  // Bot: wypełniony honeypot albo formularz wysłany szybciej, niż da się go wypełnić.
  // Odpowiadamy jak przy sukcesie, żeby nie podpowiadać, co go zdradziło.
  const elapsed = typeof body.elapsed === 'number' ? body.elapsed : 0
  if ((typeof body.website === 'string' && body.website.trim() !== '') || elapsed < LIMITS.minElapsedMs) {
    log('bot', body.website ? 'honeypot' : 'too_fast')
    return reply({ ok: true }, 200, cors)
  }

  const email = normalizeEmail(body.email)
  if (!isValidEmail(email)) return fail('invalid_email', 400, cors)

  const kv = env.OFFER_KV
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  if (!(await allowIp(kv, ip, now))) {
    log('rejected', 'ip_limit')
    return fail('rate_limited', 429, cors)
  }

  const emailHash = await sha256(email)
  const emailCheck = await checkEmail(kv, emailHash, now)
  if (emailCheck === 'duplicate') {
    // Podwójne kliknięcie albo odświeżenie: oferta już wyszła, nie wysyłamy drugi raz.
    log('duplicate')
    return reply({ ok: true }, 200, cors)
  }
  if (emailCheck === 'limited') {
    log('rejected', 'email_limit')
    return fail('rate_limited', 429, cors)
  }

  const dailyLimit = Number(env.DAILY_LIMIT) || DEFAULTS.dailyLimit
  if (!(await underDailyLimit(kv, dailyLimit, now))) {
    log('rejected', 'daily_limit')
    return fail('unavailable', 503, cors)
  }

  const pdfUrl = env.PDF_URL || DEFAULTS.pdfUrl
  if (!(await pdfAvailable(pdfUrl, fetcher))) {
    log('error', 'pdf_missing')
    return fail('unavailable', 503, cors)
  }

  const mode = mailMode(env)
  if (mode === 'dry' || !env.RESEND_API_KEY) {
    await rememberEmail(kv, emailHash, now)
    log('dry')
    return reply({ ok: true }, 200, cors)
  }

  const testPrefix = mode === 'test' ? '[TEST] ' : ''
  const bucket = Math.floor(now / LIMITS.emailCooldownMs)
  const offer: OutgoingMail = {
    from: env.MAIL_FROM || DEFAULTS.from,
    to: mode === 'test' ? env.TEST_RECIPIENT! : email,
    replyTo: env.MAIL_REPLY_TO || DEFAULTS.replyTo,
    subject: testPrefix + OFFER_SUBJECT,
    text: offerText(pdfUrl),
    html: offerHtml(pdfUrl),
    attachment: { filename: OFFER_ATTACHMENT.filename, path: pdfUrl },
    idempotencyKey: `offer-${emailHash}-${bucket}`,
  }
  const sent = await sendMail(env.RESEND_API_KEY, offer, fetcher)
  if (!sent.ok) {
    log('error', sent.status ? `${sent.kind}:${sent.status}` : sent.kind)
    return fail('unavailable', sent.kind === 'provider_429' ? 503 : 502, cors)
  }
  await rememberEmail(kv, emailHash, now)
  await countDaily(kv, now)
  log('sent', mode)

  // Powiadomienie jest dodatkiem: jego błąd nie psuje odpowiedzi dla odbiorcy.
  const notification = await sendMail(env.RESEND_API_KEY, {
    from: env.MAIL_FROM || DEFAULTS.from,
    to: env.NOTIFICATION_EMAIL || DEFAULTS.notification,
    replyTo: email,
    subject: testPrefix + NOTIFICATION_SUBJECT,
    text: notificationText(email, new Date(now), sanitizeSource(body.source)),
    idempotencyKey: `notify-${emailHash}-${bucket}`,
  }, fetcher)
  if (!notification.ok) log('error', `notification:${notification.kind}`)

  return reply({ ok: true }, 200, cors)
}

export default {
  fetch: (request: Request, env: Env) => handleRequest(request, env),
}
