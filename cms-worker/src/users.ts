/**
 * Użytkownicy (USERS_MANAGE). Zasady:
 * - nie można usunąć, zdegradować ani wyłączyć ostatniego aktywnego właściciela,
 * - rolę 'developer' nadaje i odbiera tylko developer,
 * - nikt nie zmienia własnej roli, nie wyłącza ani nie usuwa samego siebie,
 * - wyłączenie usuwa sesje użytkownika.
 */
import { isRole, type CmsUser, type Role } from '../../packages/cms-core/src/index'
import { auditStatement } from './audit'
import { currentUser, nowIso, type Ctx } from './context'
import { isValidEmail, normalizeEmail } from './auth'
import { randomId } from './crypto'
import { requirePermission } from './guard'
import { fail, json, readJson } from './http'

interface UserRow {
  id: string
  email: string
  name: string
  role: Role
  created_at: string
  last_login_at: string | null
  disabled: number
}

const toUser = (row: UserRow): CmsUser & { disabled: boolean } => ({
  id: row.id,
  email: row.email,
  name: row.name,
  role: row.role,
  createdAt: row.created_at,
  lastLoginAt: row.last_login_at,
  disabled: row.disabled === 1,
})

function cleanName(value: unknown): string {
  if (typeof value !== 'string') throw fail(400, 'bad_request', { message: 'name' })
  // eslint-disable-next-line no-control-regex
  const name = value.replace(/[\u0000-\u001F\u007F]+/g, ' ').trim()
  if (!name || name.length > 100) throw fail(400, 'bad_request', { message: 'name' })
  return name
}

async function loadUser(ctx: Ctx, id: string): Promise<UserRow> {
  const row = await ctx.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>()
  if (!row) throw fail(404, 'not_found')
  return row
}

async function activeOwners(ctx: Ctx): Promise<number> {
  const row = await ctx.env.DB.prepare('SELECT COUNT(*) AS n FROM users WHERE role = \'owner\' AND disabled = 0').first<{ n: number }>()
  return row?.n ?? 0
}

function requireDeveloperFor(ctx: Ctx, ...roles: Role[]): void {
  if (roles.includes('developer') && currentUser(ctx).role !== 'developer') throw fail(403, 'forbidden', { message: 'developer_role' })
}

export async function listUsers(ctx: Ctx): Promise<Response> {
  requirePermission(ctx, 'USERS_MANAGE')
  const { results } = await ctx.env.DB.prepare('SELECT * FROM users ORDER BY created_at, email').all<UserRow>()
  return json({ items: results.map(toUser) })
}

export async function createUser(ctx: Ctx): Promise<Response> {
  requirePermission(ctx, 'USERS_MANAGE')
  const body = await readJson(ctx.request)
  const email = normalizeEmail(body.email)
  if (!isValidEmail(email)) throw fail(400, 'bad_request', { message: 'email' })
  const name = cleanName(body.name)
  if (!isRole(body.role)) throw fail(400, 'bad_request', { message: 'role' })
  requireDeveloperFor(ctx, body.role)
  const id = randomId('usr')
  const actor = currentUser(ctx)
  const result = await ctx.env.DB.prepare(
    'INSERT INTO users (id, email, name, role, created_at, disabled) VALUES (?, ?, ?, ?, ?, 0) ON CONFLICT DO NOTHING',
  ).bind(id, email, name, body.role, nowIso(ctx)).run()
  if (result.meta.changes !== 1) throw fail(409, 'exists')
  await auditStatement(ctx, 'user_create', actor.id, null, { userId: id, role: body.role }).run()
  return json(toUser(await loadUser(ctx, id)), 201)
}

export async function patchUser(ctx: Ctx): Promise<Response> {
  requirePermission(ctx, 'USERS_MANAGE')
  const body = await readJson(ctx.request)
  const actor = currentUser(ctx)
  const target = await loadUser(ctx, ctx.params.id!)

  const name = body.name === undefined ? target.name : cleanName(body.name)
  let role = target.role
  if (body.role !== undefined) {
    if (!isRole(body.role)) throw fail(400, 'bad_request', { message: 'role' })
    role = body.role
  }
  let disabled = target.disabled === 1
  if (body.disabled !== undefined) {
    if (typeof body.disabled !== 'boolean') throw fail(400, 'bad_request', { message: 'disabled' })
    disabled = body.disabled
  }

  if (role !== target.role) {
    if (target.id === actor.id) throw fail(403, 'forbidden', { message: 'own_role' })
    requireDeveloperFor(ctx, role, target.role)
  }
  if (disabled && target.disabled === 0) {
    if (target.id === actor.id) throw fail(403, 'forbidden', { message: 'self_disable' })
    requireDeveloperFor(ctx, target.role)
  }
  const losesOwner = target.role === 'owner' && target.disabled === 0 && (role !== 'owner' || disabled)
  if (losesOwner && await activeOwners(ctx) <= 1) throw fail(409, 'last_owner')
  if (losesOwner) {
    // Warunek w samym UPDATE: dwie równoczesne degradacje nie zostawią strony bez właściciela.
    const guarded = await ctx.env.DB.prepare(
      `UPDATE users SET name = ?, role = ?, disabled = ? WHERE id = ?
       AND (SELECT COUNT(*) FROM users WHERE role = 'owner' AND disabled = 0 AND id != ?) >= 1`,
    ).bind(name, role, disabled ? 1 : 0, target.id, target.id).run()
    if (guarded.meta.changes !== 1) throw fail(409, 'last_owner')
  }

  const statements = [
    ctx.env.DB.prepare('UPDATE users SET name = ?, role = ?, disabled = ? WHERE id = ?').bind(name, role, disabled ? 1 : 0, target.id),
    auditStatement(ctx, 'user_update', actor.id, null, {
      userId: target.id,
      ...(role !== target.role ? { role: [target.role, role] } : {}),
      ...(disabled !== (target.disabled === 1) ? { disabled } : {}),
      ...(name !== target.name ? { name: true } : {}),
    }),
  ]
  if (disabled) statements.push(ctx.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(target.id))
  await ctx.env.DB.batch(statements)
  return json(toUser(await loadUser(ctx, target.id)))
}

export async function deleteUser(ctx: Ctx): Promise<Response> {
  requirePermission(ctx, 'USERS_MANAGE')
  const actor = currentUser(ctx)
  const target = await loadUser(ctx, ctx.params.id!)
  if (target.id === actor.id) throw fail(403, 'forbidden', { message: 'self_delete' })
  requireDeveloperFor(ctx, target.role)
  if (target.role === 'owner' && target.disabled === 0 && await activeOwners(ctx) <= 1) throw fail(409, 'last_owner')
  if (target.role === 'owner' && target.disabled === 0) {
    const guarded = await ctx.env.DB.prepare(
      `DELETE FROM users WHERE id = ?
       AND (SELECT COUNT(*) FROM users WHERE role = 'owner' AND disabled = 0 AND id != ?) >= 1`,
    ).bind(target.id, target.id).run()
    if (guarded.meta.changes !== 1) throw fail(409, 'last_owner')
  }
  await ctx.env.DB.batch([
    ctx.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(target.id),
    ctx.env.DB.prepare('DELETE FROM login_tokens WHERE user_id = ?').bind(target.id),
    ctx.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(target.id),
    auditStatement(ctx, 'user_delete', actor.id, null, { userId: target.id, role: target.role }),
  ])
  return json({ ok: true })
}
