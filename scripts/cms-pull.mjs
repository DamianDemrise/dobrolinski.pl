#!/usr/bin/env node
/**
 * Pobiera opublikowaną treść z DEMRISE CMS przed `nuxt generate` (GitHub Actions i lokalnie).
 *
 *   GET ${CMS_API_URL}/api/public/site → content/published.json (sortowane klucze, 2 spacje)
 *   media /media/<id>/<plik> → public/media/<id>/<plik> (src przepisany na ścieżkę lokalną)
 *   tokeny → app/assets/css/tokens.css (scripts/cms-tokens.mjs)
 *
 * Każdy błąd (sieć, kształt danych, media, tokeny) = ostrzeżenie i kod 0: snapshot z repo
 * zostaje nietknięty, więc build nigdy nie zależy od dostępności API. Node 22, bez zależności.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateTokensCss, TOKENS_CSS_PATH } from './cms-tokens.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const API = (process.env.CMS_API_URL || 'https://dobrolinski-cms.demrise.workers.dev').replace(/\/+$/, '')
const SNAPSHOT = resolve(ROOT, 'content/published.json')
const TOKENS_MAP = resolve(ROOT, 'cms/tokens-css.json')
const MEDIA_DIR = resolve(ROOT, 'public/media')
const TIMEOUT_MS = 15000
const REQUIRED_PAGES = ['', 'poznaj-czlowieka', 'polityka-prywatnosci']
const TOKEN_GROUPS = ['colors', 'typography', 'spacing', 'widths', 'radius', 'breakpoints']
/**
 * /media/<id>/<plik>, opcjonalnie z adresem TEGO API przed ścieżką (nie z dowolnego hosta).
 * Id tylko w formacie Workera (med_ + hex), plik tylko z rozszerzeniem obrazu: nic innego
 * (HTML, SVG, JS) nie trafi z treści CMS do public/ na dobrolinski.pl.
 */
const MEDIA_RE = /^\/media\/(med_[0-9a-f]{20})\/([a-z0-9][a-z0-9._-]{0,120}\.(?:png|jpe?g|webp|avif|gif))$/

const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v)

/** JSON z posortowanymi kluczami obiektów (tablice w kolejności): stabilny diff w repo. */
export function stableJson(value) {
  const sort = (v) => {
    if (Array.isArray(v)) return v.map(sort)
    if (!isObject(v)) return v
    return Object.fromEntries(Object.keys(v).sort().map(k => [k, sort(v[k])]))
  }
  return `${JSON.stringify(sort(value), null, 2)}\n`
}

/** Kształt PublishedSite (pełna walidacja pól jest w CMS przy zapisie i publikacji). */
/**
 * Frazy, które nie mogą trafić do publicznego snapshotu (np. cena pilotażowa). Repo jest publiczne,
 * więc lista żyje wyłącznie w sekrecie GitHub Actions CMS_BLOCKED_TEXT (jedna fraza na linię).
 */
export function blockedPhrases(raw = process.env.CMS_BLOCKED_TEXT || '') {
  return raw.split('\n').map(line => line.trim()).filter(Boolean)
}

export const squashText = text => text.replace(/[\s\u00a0]+/g, '').toLowerCase()

export function validateSite(site, blocked = blockedPhrases()) {
  const issues = []
  if (!isObject(site)) return ['odpowiedź nie jest obiektem']
  if (typeof site.generatedAt !== 'string') issues.push('generatedAt')
  for (const key of ['pages', 'globals', 'components', 'tokens']) if (!isObject(site[key])) issues.push(key)
  if (issues.length) return issues
  for (const slug of REQUIRED_PAGES) if (!Object.hasOwn(site.pages, slug)) issues.push(`brak strony "${slug}"`)
  for (const [slug, page] of Object.entries(site.pages)) {
    if (!isObject(page) || page.slug !== slug || typeof page.title !== 'string' || typeof page.layout !== 'string'
      || !isObject(page.seo) || !Array.isArray(page.blocks)) {
      issues.push(`strona "${slug}"`)
      continue
    }
    page.blocks.forEach((block, i) => {
      if (!isObject(block) || typeof block.id !== 'string' || typeof block.type !== 'string' || !isObject(block.props)) issues.push(`strona "${slug}" blok ${i}`)
      else if (block.type === 'global' && !Object.hasOwn(site.components, block.ref ?? '')) issues.push(`strona "${slug}" blok ${i}: brak komponentu ${block.ref}`)
    })
  }
  for (const key of ['site', 'workshop']) if (!isObject(site.globals[key])) issues.push(`brak globalu "${key}"`)
  for (const group of TOKEN_GROUPS) if (!isObject(site.tokens[group])) issues.push(`tokens.${group}`)
  const text = squashText(JSON.stringify(site))
  if (blocked.some(phrase => text.includes(squashText(phrase)))) issues.push('treść zawiera frazę zablokowaną (CMS_BLOCKED_TEXT)')
  return issues
}

/** Zbiera odwołania do mediów CMS i przepisuje je na ścieżki lokalne (niemutujące). */
export function localizeMedia(value, found = new Map()) {
  if (typeof value === 'string') {
    const path = value.startsWith(`${API}/media/`) ? value.slice(API.length) : value
    const match = MEDIA_RE.exec(path)
    if (!match) return value
    const local = `/media/${match[1]}/${match[2]}`
    found.set(local, `${API}${local}`)
    return local
  }
  if (Array.isArray(value)) return value.map(v => localizeMedia(v, found))
  if (isObject(value)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, localizeMedia(v, found)]))
  return value
}

async function fetchWithTimeout(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
  return response
}

async function main() {
  const response = await fetchWithTimeout(`${API}/api/public/site`)
  const site = await response.json()
  const issues = validateSite(site)
  if (issues.length) throw new Error(`nieprawidłowy kształt treści: ${issues.slice(0, 10).join(', ')}`)

  const media = new Map()
  const localized = localizeMedia(site, media)
  const tokensCss = generateTokensCss(localized.tokens, JSON.parse(readFileSync(TOKENS_MAP, 'utf8')))

  // Najpierw wszystko w pamięci; zapis dopiero, gdy pobrały się wszystkie pliki.
  const files = []
  for (const [local, url] of media) {
    const res = await fetchWithTimeout(url)
    files.push([resolve(ROOT, 'public', `.${local}`), Buffer.from(await res.arrayBuffer())])
  }
  for (const [path, data] of files) {
    if (!path.startsWith(`${MEDIA_DIR}/`)) throw new Error(`niedozwolona ścieżka mediów ${path}`)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, data)
  }
  writeFileSync(TOKENS_CSS_PATH, tokensCss)
  writeFileSync(SNAPSHOT, stableJson(localized))
  console.log(`cms-pull: zapisano content/published.json (${Object.keys(localized.pages).length} stron, ${files.length} plików mediów)`)
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  main().catch((error) => {
    console.warn(`::warning::cms-pull: ${error instanceof Error ? error.message : String(error)}. Build użyje snapshotu z repo.`)
    process.exit(0)
  })
}
