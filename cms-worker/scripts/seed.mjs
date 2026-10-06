#!/usr/bin/env node
/**
 * Generuje migrations/0002_seed.sql z content/published.json (Node 22, bez zależności).
 * Uruchom: node cms-worker/scripts/seed.mjs
 * INSERT OR IGNORE: ponowne zastosowanie niczego nie nadpisuje.
 *
 * Id encji: komponent = klucz z published.json (blok { type: 'global', ref } wskazuje id encji),
 * strona = page_<slug> (page_home dla ''), global = global_<klucz>, tokeny = tokens.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const source = join(here, '../../content/published.json')
const target = join(here, '../migrations/0002_seed.sql')

if (!existsSync(source)) {
  console.error(`Brak ${source}. Najpierw wygeneruj content/published.json (snapshot treści), potem uruchom seed ponownie.`)
  process.exit(1)
}

let site
try {
  site = JSON.parse(readFileSync(source, 'utf8'))
}
catch (error) {
  console.error(`Nie da się odczytać ${source}: ${error.message}`)
  process.exit(1)
}
for (const key of ['pages', 'globals', 'components']) {
  if (!site[key] || typeof site[key] !== 'object' || Array.isArray(site[key])) {
    console.error(`published.json: brak obiektu "${key}"`)
    process.exit(1)
  }
}
if (!site.tokens || typeof site.tokens !== 'object') {
  console.error('published.json: brak obiektu "tokens"')
  process.exit(1)
}

/** Literał SQL: NULL, liczba albo tekst w apostrofach (apostrof podwojony, bez znaków NUL). */
function sql(value) {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('liczba spoza zakresu')
    return String(value)
  }
  const text = String(value)
  if (text.includes('\u0000')) throw new Error('znak NUL w danych')
  return `'${text.replace(/'/g, '\'\'')}'`
}

const idPart = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const at = typeof site.generatedAt === 'string' ? site.generatedAt : new Date().toISOString()

const users = [
  { id: 'usr_owner_damian', email: 'damian@dobrolinski.pl', name: 'Damian Dobroliński', role: 'owner' },
  { id: 'usr_dev_demrise', email: 'damian@demrise.pl', name: 'Damian (DEMRISE)', role: 'developer' },
]

const entities = []
for (const [key, doc] of Object.entries(site.pages)) {
  const slug = typeof doc.slug === 'string' ? doc.slug : key
  entities.push({ id: `page_${idPart(slug) || 'home'}`, kind: 'page', slug, title: doc.title || slug || 'Strona główna', doc })
}
for (const [key, doc] of Object.entries(site.globals)) {
  entities.push({ id: `global_${idPart(key)}`, kind: 'global', slug: key, title: key, doc })
}
for (const [key, doc] of Object.entries(site.components)) {
  entities.push({ id: key, kind: 'component', slug: key, title: doc.name || key, doc })
}
entities.push({ id: 'tokens', kind: 'tokens', slug: 'tokens', title: 'Tokeny', doc: site.tokens })

const ids = new Set()
for (const entity of entities) {
  if (ids.has(entity.id)) {
    console.error(`Powtórzone id encji: ${entity.id}`)
    process.exit(1)
  }
  ids.add(entity.id)
}

const lines = [
  '-- Wygenerowane przez cms-worker/scripts/seed.mjs z content/published.json. Nie edytuj ręcznie.',
  `-- Źródło: generatedAt ${at}`,
  '',
]
for (const u of users) {
  lines.push(`INSERT OR IGNORE INTO users (id, email, name, role, created_at, disabled) VALUES (${[u.id, u.email, u.name, u.role, at].map(sql).join(', ')}, 0);`)
}
lines.push('')
for (const e of entities) {
  const json = JSON.stringify(e.doc)
  lines.push(
    'INSERT OR IGNORE INTO entities (id, kind, slug, title, draft_json, draft_rev, published_json, published_at, published_by, updated_at, updated_by) VALUES ('
    + [e.id, e.kind, e.slug, e.title, json].map(sql).join(', ')
    + `, 1, ${sql(json)}, ${sql(at)}, NULL, ${sql(at)}, NULL);`,
  )
  lines.push(
    'INSERT OR IGNORE INTO revisions (id, entity_id, version, kind, data_json, created_at, created_by) VALUES ('
    + [`rev_seed_${e.id}`, e.id].map(sql).join(', ')
    + `, 1, 'publish', ${sql(json)}, ${sql(at)}, NULL);`,
  )
}
lines.push('')

writeFileSync(target, lines.join('\n'))
console.log(`Zapisano ${target}: ${users.length} użytkowników, ${entities.length} encji.`)
