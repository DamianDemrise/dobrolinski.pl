/**
 * Limity w D1 (tabela rate_limits), okno stałe. Klucze to SHA-256, więc w bazie
 * nie leżą ani adresy e-mail, ani IP. Inkrement jest jednym zapytaniem (upsert),
 * więc równoległe requesty się nie gubią.
 */
import type { Ctx } from './context'
import { sha256Hex } from './crypto'

/** Liczy próbę i zwraca true, gdy w oknie jest ich najwyżej `limit`. */
export async function hit(ctx: Ctx, scope: string, value: string, limit: number, windowMs: number): Promise<boolean> {
  const now = ctx.deps.now()
  const key = `${scope}:${await sha256Hex(value)}`
  const row = await ctx.env.DB.prepare(
    `INSERT INTO rate_limits (key, count, reset_at) VALUES (?1, 1, ?2)
     ON CONFLICT(key) DO UPDATE SET
       count = CASE WHEN rate_limits.reset_at <= ?3 THEN 1 ELSE rate_limits.count + 1 END,
       reset_at = CASE WHEN rate_limits.reset_at <= ?3 THEN ?2 ELSE rate_limits.reset_at END
     RETURNING count`,
  ).bind(key, now + windowMs, now).first<{ count: number }>()
  return (row?.count ?? Number.POSITIVE_INFINITY) <= limit
}

export async function pruneRateLimits(ctx: Ctx): Promise<void> {
  await ctx.env.DB.prepare('DELETE FROM rate_limits WHERE reset_at <= ?').bind(ctx.deps.now()).run()
}
