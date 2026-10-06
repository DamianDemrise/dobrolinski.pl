/** Dziennik zdarzeń: logowanie, publikacja, przywrócenie, zmiany użytkowników, usunięcie mediów. */
import type { Ctx } from './context'
import { nowIso } from './context'

export type AuditAction =
  | 'login' | 'logout' | 'publish' | 'restore' | 'discard'
  | 'entity_create' | 'entity_delete'
  | 'user_create' | 'user_update' | 'user_delete'
  | 'media_delete' | 'rebuild'

export function auditStatement(ctx: Ctx, action: AuditAction, userId: string | null, entityId: string | null = null, detail?: Record<string, unknown>) {
  return ctx.env.DB.prepare('INSERT INTO audit_log (at, user_id, action, entity_id, detail) VALUES (?, ?, ?, ?, ?)')
    .bind(nowIso(ctx), userId, action, entityId, detail ? JSON.stringify(detail) : null)
}

export async function audit(ctx: Ctx, action: AuditAction, userId: string | null, entityId: string | null = null, detail?: Record<string, unknown>) {
  await auditStatement(ctx, action, userId, entityId, detail).run()
}
