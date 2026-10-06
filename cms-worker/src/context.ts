/** Kontekst requestu przekazywany do tras. */
import type { Permission, Role } from '../../packages/cms-core/src/index'
import type { Deps, Env } from './env'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: Role
  createdAt: string
  lastLoginAt: string | null
  permissions: Permission[]
  sessionHash: string
}

export interface Ctx {
  request: Request
  env: Env
  deps: Deps
  url: URL
  params: Record<string, string>
  user: SessionUser | null
  /** Praca po odpowiedzi (ExecutionContext.waitUntil); bez niego czekamy na miejscu. */
  waitUntil?: (promise: Promise<unknown>) => void
}

export async function background(ctx: Ctx, promise: Promise<unknown>): Promise<void> {
  if (ctx.waitUntil) ctx.waitUntil(promise)
  else await promise
}

/** Użytkownik z sesją: trasy chronione dostają go zawsze (router sprawdza sesję wcześniej). */
export function currentUser(ctx: Ctx): SessionUser {
  if (!ctx.user) throw new Error('route without session')
  return ctx.user
}

export const nowIso = (ctx: Ctx) => new Date(ctx.deps.now()).toISOString()
