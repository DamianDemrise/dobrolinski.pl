/**
 * Snapshot opublikowanej treści jako mapa klucz → dane i porównanie trójstronne
 * (repo, baza z ostatniej synchronizacji, panel). Czyste funkcje, bez D1 i sieci.
 *
 * Klucze: page:<slug>, global:<klucz>, component:<id>, tokens.
 */
import type { PendingChange, PublishedSite } from '../../packages/cms-core/src/index'

export type Entries = Map<string, unknown>

const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v)

const sortDeep = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(sortDeep)
  if (!isObject(v)) return v
  return Object.fromEntries(Object.keys(v).sort().map(k => [k, sortDeep(v[k])]))
}

/** Format pliku w repo: posortowane klucze, 2 spacje, \n na końcu (jak scripts/cms-pull.mjs). */
export const stableJson = (value: unknown) => `${JSON.stringify(sortDeep(value), null, 2)}\n`

/** Porównanie treści niezależne od kolejności kluczy. */
export const canonical = (value: unknown) => JSON.stringify(sortDeep(value))
export const same = (a: unknown, b: unknown) => canonical(a) === canonical(b)

export function entriesOf(site: PublishedSite): Entries {
  const map: Entries = new Map()
  for (const [slug, page] of Object.entries(site.pages ?? {})) map.set(`page:${slug}`, page)
  for (const [key, value] of Object.entries(site.globals ?? {})) map.set(`global:${key}`, value)
  for (const [id, component] of Object.entries(site.components ?? {})) map.set(`component:${id}`, component)
  if (site.tokens) map.set('tokens', site.tokens)
  return map
}

export type KeyRef = { kind: 'page' | 'global' | 'component', ident: string } | { kind: 'tokens', ident: 'tokens' }

export function parseKey(key: string): KeyRef | null {
  if (key === 'tokens') return { kind: 'tokens', ident: 'tokens' }
  const match = /^(page|global|component):(.*)$/.exec(key)
  return match ? { kind: match[1] as 'page' | 'global' | 'component', ident: match[2]! } : null
}

export interface ThreeWayResult {
  /** Zmiany z repo do przyjęcia w panelu (undefined = usunięte w repo). */
  apply: [string, unknown][]
  /** Zmienione i w repo, i w panelu, różnie. */
  conflicts: string[]
}

/**
 * repo vs baza vs panel, per klucz:
 * repo bez zmian → nic; panel bez zmian → przyjmij repo; obie strony tak samo → nic; inaczej → konflikt.
 */
export function threeWay(repo: Entries, base: Entries, local: Entries): ThreeWayResult {
  const apply: [string, unknown][] = []
  const conflicts: string[] = []
  for (const key of new Set([...repo.keys(), ...base.keys()])) {
    const r = repo.get(key)
    const b = base.get(key)
    if (same(r, b)) continue
    const l = local.get(key)
    if (same(l, b)) apply.push([key, r])
    else if (!same(l, r)) conflicts.push(key)
  }
  return { apply, conflicts }
}

/** Co wypchnięcie zmieni na stronie: panel względem repo. */
export function pendingChanges(local: Entries, repo: Entries, titleOf: (key: string, value: unknown) => string): PendingChange[] {
  const changes: PendingChange[] = []
  for (const key of new Set([...local.keys(), ...repo.keys()])) {
    const l = local.get(key)
    const r = repo.get(key)
    if (same(l, r)) continue
    const change = r === undefined ? 'added' : l === undefined ? 'removed' : 'changed'
    changes.push({ key, title: titleOf(key, l ?? r), change })
  }
  return changes.sort((a, b) => a.key.localeCompare(b.key))
}

const MEDIA_RE = /^\/media\/(med_[0-9a-f]{20})\/([a-z0-9][a-z0-9._-]{0,120}\.(?:png|jpe?g|webp|avif|gif))$/

/** Odwołania do mediów CMS w treści: '/media/<id>/<plik>' → [id, plik]. */
export function mediaRefs(value: unknown, found = new Map<string, [string, string]>()): Map<string, [string, string]> {
  if (typeof value === 'string') {
    const match = MEDIA_RE.exec(value)
    if (match) found.set(value, [match[1]!, match[2]!])
  }
  else if (Array.isArray(value)) value.forEach(v => mediaRefs(v, found))
  else if (isObject(value)) Object.values(value).forEach(v => mediaRefs(v, found))
  return found
}

/** sha blobu git (sha1 z nagłówkiem "blob <bajty>\0"), żeby znać wersję pliku po commicie. */
export async function gitBlobSha(text: string): Promise<string> {
  const body = new TextEncoder().encode(text)
  const header = new TextEncoder().encode(`blob ${body.length}\0`)
  const data = new Uint8Array(header.length + body.length)
  data.set(header)
  data.set(body, header.length)
  const digest = await crypto.subtle.digest('SHA-1', data)
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
}
