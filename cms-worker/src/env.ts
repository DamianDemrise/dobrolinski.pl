/**
 * Bindingi i zmienne Workera. Minimalne interfejsy Cloudflare bez zależności
 * od @cloudflare/workers-types (tak jak offer-worker).
 */
import type { SiteSchema } from '../../packages/cms-core/src/index'

export interface D1Meta { changes: number, last_row_id: number }
export interface D1Result<T = Record<string, unknown>> { results: T[], success: boolean, meta: D1Meta }

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = Record<string, unknown>>(): Promise<T | null>
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>
  run(): Promise<D1Result>
}

export interface D1Database {
  prepare(sql: string): D1PreparedStatement
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>
  exec(sql: string): Promise<unknown>
}

export interface KVNamespace {
  get(key: string, type: 'arrayBuffer'): Promise<ArrayBuffer | null>
  put(key: string, value: ArrayBuffer | string): Promise<void>
  delete(key: string): Promise<void>
}

export interface Fetcher { fetch(request: Request): Promise<Response> }

export interface Env {
  DB: D1Database
  MEDIA: KVNamespace
  ASSETS?: Fetcher
  SITE_URL?: string
  ADMIN_ORIGIN?: string
  MAIL_FROM?: string
  /** live: link logowania wysyłany mailem; dry: tylko w logu. */
  MAIL_MODE?: string
  GITHUB_REPO?: string
  RESEND_API_KEY?: string
  GITHUB_TOKEN?: string
  /** '1': publikacja od razu uruchamia przebudowę. Domyślnie wypychanie ręczne (przycisk w panelu). */
  REBUILD_ON_PUBLISH?: string
  /** '1' tylko lokalnie: dopuszcza Origin http://localhost:8787 i http://127.0.0.1:8787. */
  DEV?: string
}

/** Zależności wstrzykiwane: schemat strony, fetch (Resend, GitHub) i zegar. */
export interface Deps {
  schema: SiteSchema
  fetch: typeof fetch
  now: () => number
}

export const DEFAULTS = {
  siteUrl: 'https://dobrolinski.pl',
  adminOrigin: 'https://dobrolinski-cms.demrise.workers.dev',
  mailFrom: 'Damian Dobroliński CMS <cms@dobrolinski.pl>',
} as const

export const LIMITS = {
  jsonBytes: 2 * 1024 * 1024,
  mediaBytes: 5 * 1024 * 1024,
  loginTokenMs: 15 * 60 * 1000,
  sessionMs: 12 * 60 * 60 * 1000,
  sessionTouchMs: 60 * 1000,
  rateWindowMs: 15 * 60 * 1000,
  ratePerEmail: 3,
  ratePerIp: 10,
  checkpointMs: 5 * 60 * 1000,
  providerTimeoutMs: 8000,
} as const

export const adminOrigin = (env: Env) => env.ADMIN_ORIGIN || DEFAULTS.adminOrigin
