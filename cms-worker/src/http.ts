/** Odpowiedzi JSON, błędy, odczyt body i nagłówki bezpieczeństwa. */
import { LIMITS } from './env'

export class HttpError extends Error {
  constructor(public status: number, public body: Record<string, unknown>) {
    super(String(body.error))
  }
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  })
}

export const fail = (status: number, error: string, extra: Record<string, unknown> = {}) =>
  new HttpError(status, { error, ...extra })

/** Body JSON: limit 2 MB, musi być obiektem. */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const declared = Number(request.headers.get('Content-Length') ?? 0)
  if (declared > LIMITS.jsonBytes) throw fail(413, 'too_large')
  const type = request.headers.get('Content-Type') ?? ''
  if (!type.toLowerCase().startsWith('application/json')) throw fail(415, 'unsupported_media_type')
  const raw = await request.text()
  if (new TextEncoder().encode(raw).length > LIMITS.jsonBytes) throw fail(413, 'too_large')
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  }
  catch {
    throw fail(400, 'bad_request', { message: 'malformed_json' })
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw fail(400, 'bad_request', { message: 'expected_object' })
  return parsed as Record<string, unknown>
}

/** Body opcjonalne (np. discard): brak treści = pusty obiekt. */
export async function readOptionalJson(request: Request): Promise<Record<string, unknown>> {
  if (!request.body) return {}
  if (!request.headers.get('Content-Type')) {
    if ((await request.text()).trim() === '') return {}
    throw fail(415, 'unsupported_media_type')
  }
  return readJson(request)
}

export const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000',
  'Content-Security-Policy': [
    'default-src \'self\'',
    'img-src \'self\' data: blob: https:',
    'style-src \'self\' \'unsafe-inline\'',
    'script-src \'self\' \'unsafe-inline\'',
    'connect-src \'self\'',
    'frame-ancestors \'self\'',
    'base-uri \'self\'',
    'form-action \'self\'',
    'object-src \'none\'',
  ].join('; '),
}

/** Dokleja nagłówki bezpieczeństwa; nagłówek ustawiony przez trasę ma pierwszeństwo. */
export function withSecurityHeaders(response: Response): Response {
  const result = new Response(response.body, response)
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!result.headers.has(name)) result.headers.set(name, value)
  }
  return result
}

export function redirect(location: string, headers: Record<string, string> = {}): Response {
  return new Response(null, { status: 302, headers: { 'Location': location, 'Cache-Control': 'no-store', ...headers } })
}
