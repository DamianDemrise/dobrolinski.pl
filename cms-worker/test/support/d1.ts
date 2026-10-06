/**
 * Testowe bindingi Workera: D1 na node:sqlite (DatabaseSync) z migracjami z cms-worker/migrations,
 * KV w pamięci i fetch, który zapisuje wywołania Resend i GitHub.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync, type SQLInputValue } from 'node:sqlite'
import type { D1Database, D1PreparedStatement, D1Result, KVNamespace } from '../../src/env'

const MIGRATIONS = join(import.meta.dirname, '../../migrations')

function toSql(value: unknown): SQLInputValue {
  if (value === undefined) throw new TypeError('D1_TYPE_ERROR: undefined is not a supported bind value')
  if (typeof value === 'boolean') return value ? 1 : 0
  return value as SQLInputValue
}

class Statement implements D1PreparedStatement {
  constructor(private db: DatabaseSync, readonly sql: string, readonly params: SQLInputValue[] = []) {}

  bind(...values: unknown[]): D1PreparedStatement {
    return new Statement(this.db, this.sql, values.map(toSql))
  }

  async first<T>(): Promise<T | null> {
    return this.firstSync<T>()
  }

  firstSync<T>(): T | null {
    const row = this.db.prepare(this.sql).get(...this.params)
    return (row ?? null) as T | null
  }

  async all<T>(): Promise<D1Result<T>> {
    return this.allSync<T>()
  }

  allSync<T>(): D1Result<T> {
    const statement = this.db.prepare(this.sql)
    if (statement.columns().length === 0) {
      const info = statement.run(...this.params)
      return { results: [], success: true, meta: { changes: Number(info.changes), last_row_id: Number(info.lastInsertRowid) } }
    }
    const results = statement.all(...this.params) as T[]
    return { results, success: true, meta: { changes: 0, last_row_id: 0 } }
  }

  async run(): Promise<D1Result> {
    return this.runSync()
  }

  runSync(): D1Result {
    const statement = this.db.prepare(this.sql)
    if (statement.columns().length > 0) {
      const results = statement.all(...this.params) as Record<string, unknown>[]
      return { results, success: true, meta: { changes: Number((this.db.prepare('SELECT changes() AS n').get() as { n: number }).n), last_row_id: 0 } }
    }
    const info = statement.run(...this.params)
    return { results: [], success: true, meta: { changes: Number(info.changes), last_row_id: Number(info.lastInsertRowid) } }
  }
}

export interface TestD1 extends D1Database { raw: DatabaseSync }

export function createD1(): TestD1 {
  const db = new DatabaseSync(':memory:')
  db.exec('PRAGMA foreign_keys = ON')
  for (const file of readdirSync(MIGRATIONS).filter(f => f.endsWith('.sql') && !f.includes('seed')).sort()) {
    db.exec(readFileSync(join(MIGRATIONS, file), 'utf8'))
  }
  return {
    raw: db,
    prepare: (sql: string) => new Statement(db, sql),
    async batch(statements: D1PreparedStatement[]) {
      db.exec('BEGIN')
      try {
        const results = statements.map(s => (s as Statement).runSync())
        db.exec('COMMIT')
        return results
      }
      catch (error) {
        db.exec('ROLLBACK')
        throw error
      }
    },
    async exec(sql: string) {
      db.exec(sql)
      return { count: 1 }
    },
  }
}

export interface TestKV extends KVNamespace { store: Map<string, ArrayBuffer | string> }

export function memoryKV(): TestKV {
  const store = new Map<string, ArrayBuffer | string>()
  return {
    store,
    async get(key: string) {
      const value = store.get(key)
      if (value === undefined) return null
      return typeof value === 'string' ? new TextEncoder().encode(value).buffer as ArrayBuffer : value.slice(0)
    },
    async put(key: string, value: ArrayBuffer | string) {
      store.set(key, typeof value === 'string' ? value : value.slice(0))
    },
    async delete(key: string) {
      store.delete(key)
    },
  }
}

export interface FakeCall { url: string, init?: RequestInit, body: unknown }

export function fakeFetch(options: { github?: number, resend?: number } = {}) {
  const calls: FakeCall[] = []
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    let body: unknown
    try {
      body = init?.body ? JSON.parse(String(init.body)) : null
    }
    catch {
      body = init?.body
    }
    calls.push({ url, init, body })
    if (url.startsWith('https://api.resend.com/')) return new Response('{"id":"mail"}', { status: options.resend ?? 200 })
    if (url.startsWith('https://api.github.com/')) return new Response(null, { status: options.github ?? 204 })
    return new Response('not found', { status: 404 })
  }) as typeof fetch
  return {
    fetch: fetcher,
    calls,
    resend: () => calls.filter(c => c.url.startsWith('https://api.resend.com/')),
    github: () => calls.filter(c => c.url.startsWith('https://api.github.com/')),
  }
}
