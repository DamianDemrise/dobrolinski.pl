/**
 * Ochrona zapisów: nagłówek X-CMS-Request: 1 (formularz z obcej strony go nie ustawi
 * bez preflightu CORS, którego nie obsługujemy) i Origin równy originowi panelu.
 * Cookie SameSite=Strict jest trzecią warstwą.
 */
import { CMS_REQUEST_HEADER } from '../../packages/cms-core/src/index'
import { adminOrigin, type Env } from './env'

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const DEV_ORIGINS = ['http://localhost:8787', 'http://127.0.0.1:8787']

export const isMutating = (method: string) => MUTATING.has(method)

export function allowedOrigins(env: Env): string[] {
  return env.DEV === '1' ? [adminOrigin(env), ...DEV_ORIGINS] : [adminOrigin(env)]
}

export function csrfOk(request: Request, env: Env): boolean {
  if (request.headers.get(CMS_REQUEST_HEADER) !== '1') return false
  const origin = request.headers.get('Origin')
  return Boolean(origin && allowedOrigins(env).includes(origin))
}
