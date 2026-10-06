/**
 * Logowanie linkiem e-mail. POST /api/auth/request zawsze odpowiada 200 {ok:true}:
 * po odpowiedzi nie da się poznać, czy adres jest w bazie ani czy zadziałał limit.
 */
import type { MeResponse } from '../../packages/cms-core/src/index'
import { audit } from './audit'
import { background, currentUser, nowIso, type Ctx } from './context'
import { randomToken, sha256Hex } from './crypto'
import { allowedOrigins } from './csrf'
import { adminOrigin, LIMITS } from './env'
import { json, readJson, redirect } from './http'
import { sendLoginLink } from './mail'
import { hit, pruneRateLimits } from './ratelimit'
import { clearedSessionCookie, createSession, deleteSession, sessionCookie } from './sessions'

export const normalizeEmail = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : ''
export const isValidEmail = (email: string) =>
  email.length <= 254 && /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i.test(email)

export async function requestLink(ctx: Ctx): Promise<Response> {
  const body = await readJson(ctx.request)
  const email = normalizeEmail(body.email)
  const ok = json({ ok: true })
  if (!isValidEmail(email)) return ok

  const ip = ctx.request.headers.get('CF-Connecting-IP') ?? 'unknown'
  const ipOk = await hit(ctx, 'auth-ip', ip, LIMITS.ratePerIp, LIMITS.rateWindowMs)
  const emailOk = await hit(ctx, 'auth-email', email, LIMITS.ratePerEmail, LIMITS.rateWindowMs)
  if (!ipOk || !emailOk) {
    console.log(JSON.stringify({ event: 'auth_request', status: 'rate_limited' }))
    return ok
  }

  const now = ctx.deps.now()
  // Sprzątanie przy okazji: wygasłe tokeny, sesje i liczniki.
  await ctx.env.DB.batch([
    ctx.env.DB.prepare('DELETE FROM login_tokens WHERE expires_at <= ?').bind(now),
    ctx.env.DB.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now),
  ])
  await pruneRateLimits(ctx)

  const user = await ctx.env.DB.prepare('SELECT id FROM users WHERE email = ? AND disabled = 0').bind(email).first<{ id: string }>()
  if (!user) return ok

  const token = randomToken(32)
  await ctx.env.DB.prepare('INSERT INTO login_tokens (token_hash, user_id, expires_at, used_at) VALUES (?, ?, ?, NULL)')
    .bind(await sha256Hex(token), user.id, now + LIMITS.loginTokenMs).run()
  const link = `${adminOrigin(ctx.env)}/api/auth/verify?token=${encodeURIComponent(token)}`
  // Wysyłka po odpowiedzi: czas odpowiedzi nie zdradza, czy adres istnieje.
  await background(ctx, sendLoginLink(ctx.env, ctx.deps.fetch, email, link))
  return ok
}

const TOKEN_FORMAT = /^[\w-]{20,128}$/
// Token jest w URL: nie przekazujemy go dalej w Referer.
const NO_REFERRER = { 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store' }
const invalidLink = () => redirect('/admin/login?error=link', NO_REFERRER)

/**
 * GET z maila tylko pokazuje przycisk „Zaloguj”. Token zużywa dopiero POST, więc skanery
 * poczty (np. Outlook Safe Links), które same otwierają linki, nie spalą logowania.
 */
export async function verifyPage(ctx: Ctx): Promise<Response> {
  const token = ctx.url.searchParams.get('token') ?? ''
  if (!TOKEN_FORMAT.test(token)) return invalidLink()
  const row = await ctx.env.DB.prepare(
    'SELECT 1 AS ok FROM login_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?',
  ).bind(await sha256Hex(token), ctx.deps.now()).first<{ ok: number }>()
  if (!row) return invalidLink()
  const html = `<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Logowanie | CMS</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#111;color:#eee;font:16px/1.5 system-ui,-apple-system,sans-serif}main{padding:32px;max-width:360px;text-align:center}button{margin-top:20px;padding:12px 22px;border:0;border-radius:4px;background:#f2f2ef;color:#0a0a0a;font:600 15px system-ui,sans-serif;cursor:pointer}button:focus-visible{outline:2px solid #fff;outline-offset:3px}</style></head>
<body><main><h1 style="font-size:20px;margin:0">Logowanie do panelu</h1><p style="color:#aaa;margin:8px 0 0">Kliknij, żeby się zalogować. Link działa raz.</p>
<form method="post" action="/api/auth/verify"><input type="hidden" name="token" value="${token}"><button type="submit">Zaloguj</button></form></main></body></html>`
  // same-origin, nie no-referrer: przy no-referrer przeglądarka wysyła z formularza `Origin: null`
  // i POST nie przeszedłby sprawdzenia originu. Strona nie ładuje nic z zewnątrz, więc token nie wycieka.
  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Referrer-Policy': 'same-origin', 'Cache-Control': 'no-store' } })
}

export async function verifyLink(ctx: Ctx): Promise<Response> {
  // Logowanie tylko z formularza panelu (ten sam origin): chroni przed „login CSRF”.
  const origin = ctx.request.headers.get('Origin')
  if (!origin || !allowedOrigins(ctx.env).includes(origin)) return json({ error: 'csrf' }, 403)
  let token = ''
  const type = ctx.request.headers.get('Content-Type') ?? ''
  if (type.startsWith('application/x-www-form-urlencoded')) {
    const form = new URLSearchParams((await ctx.request.text()).slice(0, 1024))
    token = form.get('token') ?? ''
  }
  if (!TOKEN_FORMAT.test(token)) return invalidLink()
  const hash = await sha256Hex(token)
  const now = ctx.deps.now()
  // Warunkowy UPDATE: przy dwóch równoczesnych kliknięciach wygrywa jedno.
  const used = await ctx.env.DB.prepare(
    'UPDATE login_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL AND expires_at > ? RETURNING user_id',
  ).bind(now, hash, now).first<{ user_id: string }>()
  if (!used) return invalidLink()
  const user = await ctx.env.DB.prepare('SELECT id FROM users WHERE id = ? AND disabled = 0').bind(used.user_id).first<{ id: string }>()
  if (!user) return invalidLink()

  const sessionId = await createSession(ctx, user.id)
  await ctx.env.DB.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').bind(nowIso(ctx), user.id).run()
  await audit(ctx, 'login', user.id)
  return new Response(null, { status: 303, headers: { Location: '/admin/', ...NO_REFERRER, 'Set-Cookie': sessionCookie(sessionId) } })
}

export async function logout(ctx: Ctx): Promise<Response> {
  const user = currentUser(ctx)
  await deleteSession(ctx, user.sessionHash)
  await audit(ctx, 'logout', user.id)
  return json({ ok: true }, 200, { 'Set-Cookie': clearedSessionCookie() })
}

export function me(ctx: Ctx): Response {
  const user = currentUser(ctx)
  const body: MeResponse = {
    user: { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt, lastLoginAt: user.lastLoginAt },
    permissions: user.permissions,
  }
  return json(body)
}
