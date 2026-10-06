/**
 * Sesje w D1. Cookie niesie losowy identyfikator (32 bajty), baza tylko jego SHA-256.
 * Sesja żyje 12 h od zalogowania; last_seen_at odświeżamy najwyżej raz na minutę.
 */
import { isRole, permissionsFor, type Role } from '../../packages/cms-core/src/index'
import type { Ctx, SessionUser } from './context'
import { LIMITS } from './env'
import { randomToken, sha256Hex } from './crypto'

export const SESSION_COOKIE = '__Host-cms_session'

export function sessionCookie(id: string): string {
  return `${SESSION_COOKIE}=${id}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${LIMITS.sessionMs / 1000}`
}

export const clearedSessionCookie = () => `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`

export function readSessionCookie(request: Request): string | null {
  const header = request.headers.get('Cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const index = part.indexOf('=')
    if (index < 0) continue
    if (part.slice(0, index).trim() === SESSION_COOKIE) {
      const value = part.slice(index + 1).trim()
      return /^[\w-]{20,128}$/.test(value) ? value : null
    }
  }
  return null
}

export async function createSession(ctx: Ctx, userId: string): Promise<string> {
  const id = randomToken(32)
  const now = ctx.deps.now()
  const userAgent = (ctx.request.headers.get('User-Agent') ?? '').slice(0, 200)
  await ctx.env.DB.prepare(
    'INSERT INTO sessions (id_hash, user_id, created_at, expires_at, last_seen_at, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
  ).bind(await sha256Hex(id), userId, now, now + LIMITS.sessionMs, now, userAgent).run()
  return id
}

interface SessionRow {
  id_hash: string
  expires_at: number
  last_seen_at: number
  user_id: string
  email: string
  name: string
  role: string
  created_at: string
  last_login_at: string | null
}

export type SessionLookup = { user: SessionUser } | { error: 'missing' | 'expired' }

export async function loadSession(ctx: Ctx): Promise<SessionLookup> {
  const id = readSessionCookie(ctx.request)
  if (!id) return { error: 'missing' }
  const hash = await sha256Hex(id)
  const row = await ctx.env.DB.prepare(
    `SELECT s.id_hash, s.expires_at, s.last_seen_at, u.id AS user_id, u.email, u.name, u.role, u.created_at, u.last_login_at
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id_hash = ? AND u.disabled = 0`,
  ).bind(hash).first<SessionRow>()
  if (!row || !isRole(row.role)) return { error: 'missing' }
  const now = ctx.deps.now()
  if (row.expires_at <= now) {
    await ctx.env.DB.prepare('DELETE FROM sessions WHERE id_hash = ?').bind(hash).run()
    return { error: 'expired' }
  }
  if (now - row.last_seen_at > LIMITS.sessionTouchMs) {
    await ctx.env.DB.prepare('UPDATE sessions SET last_seen_at = ? WHERE id_hash = ?').bind(now, hash).run()
  }
  const role = row.role as Role
  return {
    user: {
      id: row.user_id,
      email: row.email,
      name: row.name,
      role,
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at,
      permissions: permissionsFor(role),
      sessionHash: hash,
    },
  }
}

export async function deleteSession(ctx: Ctx, hash: string): Promise<void> {
  await ctx.env.DB.prepare('DELETE FROM sessions WHERE id_hash = ?').bind(hash).run()
}
