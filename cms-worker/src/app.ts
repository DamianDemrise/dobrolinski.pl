/**
 * Worker CMS: składanie tras, sesja, CSRF, nagłówki bezpieczeństwa i obsługa błędów.
 * Schemat strony, fetch i zegar są wstrzykiwane (testy używają własnego schematu).
 */
import { logout, me, requestLink, verifyLink, verifyPage } from './auth'
import type { Ctx } from './context'
import { csrfOk, isMutating } from './csrf'
import { getStats } from './dashboard'
import { createEntity, deleteEntity, discardDraft, getEntity, listEntities, publishEntity, saveDraft } from './entities'
import type { Deps, Env } from './env'
import { HttpError, json, redirect, withSecurityHeaders } from './http'
import { deleteMedia, getMedia, listMedia, mediaUsage, patchMedia, replaceMedia, serveMedia, uploadMedia } from './media'
import { publicSite } from './public'
import { getRevision, listRevisions, restoreRevision } from './revisions'
import { Router } from './router'
import { loadSession } from './sessions'
import { getSettings } from './settings'
import { getDeploy, importFromRepo, push, resolveConflict, syncPull } from './sync'
import { createUser, deleteUser, listUsers, patchUser } from './users'

export function buildRouter(): Router {
  return new Router()
    .add('POST', '/api/auth/request', requestLink, 'public')
    .add('GET', '/api/auth/verify', verifyPage, 'public')
    .add('POST', '/api/auth/verify', verifyLink, 'public')
    .add('POST', '/api/auth/logout', logout)
    .add('GET', '/api/me', me)
    .add('GET', '/api/entities', listEntities)
    .add('POST', '/api/entities', createEntity)
    .add('GET', '/api/entities/:id', getEntity)
    .add('DELETE', '/api/entities/:id', deleteEntity)
    .add('PUT', '/api/entities/:id/draft', saveDraft)
    .add('POST', '/api/entities/:id/publish', publishEntity)
    .add('POST', '/api/entities/:id/discard', discardDraft)
    .add('GET', '/api/entities/:id/revisions', listRevisions)
    .add('GET', '/api/revisions/:rid', getRevision)
    .add('POST', '/api/revisions/:rid/restore', restoreRevision)
    .add('GET', '/api/media', listMedia)
    .add('POST', '/api/media', uploadMedia)
    .add('GET', '/api/media/:id', getMedia)
    .add('PATCH', '/api/media/:id', patchMedia)
    .add('DELETE', '/api/media/:id', deleteMedia)
    .add('POST', '/api/media/:id/replace', replaceMedia)
    .add('GET', '/api/media/:id/usage', mediaUsage)
    .add('GET', '/api/users', listUsers)
    .add('POST', '/api/users', createUser)
    .add('PATCH', '/api/users/:id', patchUser)
    .add('DELETE', '/api/users/:id', deleteUser)
    .add('GET', '/api/settings', getSettings)
    .add('POST', '/api/push', push)
    .add('POST', '/api/sync/resolve', resolveConflict)
    .add('POST', '/api/sync/pull', syncPull, 'public')
    .add('GET', '/api/stats', getStats)
    .add('GET', '/api/deploy', getDeploy)
    .add('GET', '/api/public/site', publicSite, 'public')
    .add('GET', '/media/:id/:filename', serveMedia, 'public')
}

const router = buildRouter()

async function route(request: Request, env: Env, deps: Deps, waitUntil?: Ctx['waitUntil']): Promise<Response> {
  const url = new URL(request.url)
  const { pathname } = url
  if (pathname === '/') return redirect('/admin/')

  const isApi = pathname === '/api' || pathname.startsWith('/api/')
  const isMedia = pathname.startsWith('/media/')
  if (!isApi && !isMedia) {
    if (!env.ASSETS) return new Response('Not found', { status: 404 })
    return env.ASSETS.fetch(request)
  }

  // HEAD tylko dla plików mediów (HEAD na link logowania nie może zużyć tokenu).
  if (request.method === 'HEAD' && !isMedia) return json({ error: 'method_not_allowed' }, 405)
  const found = router.match(request.method, pathname)
  if (found === null) return isApi ? json({ error: 'not_found' }, 404) : new Response('Not found', { status: 404 })
  if (found === 'method') return json({ error: 'method_not_allowed' }, 405)

  const ctx: Ctx = { request, env, deps, url, params: found.params, user: null, waitUntil }
  if (found.route.access === 'session') {
    const session = await loadSession(ctx)
    if ('error' in session) return json({ error: session.error === 'expired' ? 'session_expired' : 'unauthorized' }, 401)
    ctx.user = session.user
    if (isMutating(request.method) && !csrfOk(request, env)) return json({ error: 'csrf' }, 403)
  }
  return found.route.handler(ctx)
}

export function createApp(deps: Partial<Deps> & Pick<Deps, 'schema'>) {
  const full: Deps = { fetch: (...args) => fetch(...args), now: () => Date.now(), ...deps }
  return {
    async fetch(request: Request, env: Env, executionCtx?: { waitUntil(promise: Promise<unknown>): void }): Promise<Response> {
      let response: Response
      try {
        response = await route(request, env, full, executionCtx ? p => executionCtx.waitUntil(p) : undefined)
      }
      catch (error) {
        if (error instanceof HttpError) response = json(error.body, error.status)
        else {
          // Bez stack trace w odpowiedzi; w logu tylko nazwa i komunikat.
          console.error(JSON.stringify({ event: 'error', name: error instanceof Error ? error.name : 'unknown', message: error instanceof Error ? error.message : String(error) }))
          response = json({ error: 'internal' }, 500)
        }
      }
      return withSecurityHeaders(response)
    },
    /** Cron (wrangler.toml [triggers]): import zmian z repo, gdyby ping z workflow nie dotarł. */
    async scheduled(_event: unknown, env: Env): Promise<void> {
      const request = new Request('https://cron.invalid/')
      try {
        await importFromRepo({ request, env, deps: full, url: new URL(request.url), params: {}, user: null })
      }
      catch (error) {
        console.log(JSON.stringify({ event: 'cron_import', error: error instanceof Error ? error.message : 'unknown' }))
      }
    },
  }
}
