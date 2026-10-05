/**
 * Limity w Workers KV. Klucze to skróty SHA-256, więc w KV nie leżą ani adresy
 * e-mail, ani IP. Wszystkie wpisy wygasają same (najdłużej po dobie).
 * KV jest ostatecznie spójne: przy jednoczesnych requestach z wielu miejsc
 * licznik może się pomylić o kilka, co dla tej skali jest w porządku.
 */
import { LIMITS, type KVStore } from './config.ts'

const HOUR = 3600
const DAY = 86400

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

async function readCount(kv: KVStore, key: string): Promise<number> {
  const value = Number(await kv.get(key))
  return Number.isFinite(value) ? value : 0
}

/** Liczy próbę z danego IP; false, gdy w tej godzinie było ich już za dużo. */
export async function allowIp(kv: KVStore, ip: string, now: number): Promise<boolean> {
  const key = `ip:${await sha256(ip)}:${Math.floor(now / 1000 / HOUR)}`
  const count = await readCount(kv, key)
  if (count >= LIMITS.ipPerHour) return false
  await kv.put(key, String(count + 1), { expirationTtl: HOUR + 60 })
  return true
}

interface EmailRecord { n: number, last: number }

export type EmailCheck = 'send' | 'duplicate' | 'limited'

/** Ten sam adres przed chwilą: duplikat (udajemy sukces); za często w dobie: limit. */
export async function checkEmail(kv: KVStore, emailHash: string, now: number): Promise<EmailCheck> {
  const raw = await kv.get(`em:${emailHash}`)
  if (!raw) return 'send'
  let record: EmailRecord
  try {
    record = JSON.parse(raw) as EmailRecord
  }
  catch {
    return 'send'
  }
  if (now - record.last < LIMITS.emailCooldownMs) return 'duplicate'
  if (record.n >= LIMITS.emailPerDay) return 'limited'
  return 'send'
}

export async function rememberEmail(kv: KVStore, emailHash: string, now: number): Promise<void> {
  const raw = await kv.get(`em:${emailHash}`)
  let n: number
  try {
    n = raw ? (JSON.parse(raw) as EmailRecord).n : 0
  }
  catch {
    n = 0
  }
  await kv.put(`em:${emailHash}`, JSON.stringify({ n: n + 1, last: now }), { expirationTtl: DAY })
}

const dayKey = (now: number) => `day:${new Date(now).toISOString().slice(0, 10)}`

export async function underDailyLimit(kv: KVStore, limit: number, now: number): Promise<boolean> {
  return (await readCount(kv, dayKey(now))) < limit
}

export async function countDaily(kv: KVStore, now: number): Promise<void> {
  const key = dayKey(now)
  await kv.put(key, String((await readCount(kv, key)) + 1), { expirationTtl: DAY + HOUR })
}
