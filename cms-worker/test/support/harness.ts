/** Środowisko testowe: własny schemat (fixture), dane startowe, logowanie i klient API. */
import { defineBlock, type PageDocument, type Role, type SiteSchema, type TokensDocument } from '../../../packages/cms-core/src/index'
import { createApp } from '../../src/app'
import type { Env } from '../../src/env'
import { createD1, fakeFetch, memoryKV } from './d1'

export const ORIGIN = 'https://cms.test'

export const schema: SiteSchema = {
  blocks: {
    hero: defineBlock({
      type: 'hero',
      label: 'Hero',
      region: 'hero',
      maxPerPage: 1,
      restrictions: { movable: false, removable: false },
      defaults: { title: 'Tytuł', variant: 'dark' },
      fields: [
        { key: 'title', label: 'Tytuł', type: 'text', required: true, maxLength: 80 },
        { key: 'cta', label: 'CTA', type: 'link' },
        { key: 'image', label: 'Obraz', type: 'image' },
        { key: 'variant', label: 'Wariant', type: 'select', level: 'advanced', options: [{ value: 'dark', label: 'Ciemny' }, { value: 'light', label: 'Jasny' }] },
        { key: 'customClass', label: 'Klasa', type: 'text', level: 'developer' },
        { key: 'metaNote', label: 'Notatka SEO', type: 'text', tab: 'seo' },
      ],
    }),
    text: defineBlock({
      type: 'text',
      label: 'Tekst',
      region: 'main',
      defaults: {},
      fields: [
        { key: 'heading', label: 'Nagłówek', type: 'text' },
        { key: 'body', label: 'Treść', type: 'textarea', maxLength: 500 },
      ],
    }),
  },
  globals: {
    site: {
      label: 'Ustawienia strony',
      fields: [
        { key: 'phone', label: 'Telefon', type: 'text' },
        { key: 'analyticsId', label: 'GA', type: 'text', level: 'developer' },
      ],
    },
  },
  layouts: { home: { label: 'Główna', regions: ['hero', 'main'] } },
  seoFields: [
    { key: 'title', label: 'Title', type: 'text', maxLength: 70 },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'canonical', label: 'Canonical', type: 'text' },
    { key: 'ogTitle', label: 'OG title', type: 'text' },
    { key: 'ogDescription', label: 'OG description', type: 'textarea' },
    { key: 'ogImage', label: 'OG image', type: 'text' },
    { key: 'noindex', label: 'Noindex', type: 'toggle', level: 'advanced' },
  ],
}

export function homePage(): PageDocument {
  return {
    title: 'Główna',
    slug: '',
    layout: 'home',
    seo: { title: 'T', description: 'D', canonical: 'https://x.pl/', ogTitle: '', ogDescription: '', ogImage: '', noindex: false },
    blocks: [
      { id: 'h1', type: 'hero', props: { title: 'Cześć', variant: 'dark' } },
      { id: 't1', type: 'text', props: { heading: 'A' } },
      { id: 'g1', type: 'global', ref: 'cmp_banner', props: {}, overrides: {} },
    ],
  }
}

export const tokens: TokensDocument = {
  colors: { gold: { value: '#c9a24b', label: 'Złoty' } },
  typography: {},
  spacing: {},
  widths: {},
  radius: {},
  breakpoints: {},
}

export const USERS: Record<Role, string> = {
  owner: 'owner@test.pl',
  editor: 'editor@test.pl',
  content_editor: 'content@test.pl',
  developer: 'dev@test.pl',
}

export type Api = (method: string, path: string, options?: { body?: unknown, cookie?: string | null, headers?: Record<string, string>, raw?: BodyInit }) => Promise<Response>

export function setup(options: { github?: boolean, githubStatus?: number, env?: Partial<Env>, actionsFetch?: typeof fetch } = {}) {
  let clock = Date.parse('2026-10-06T10:00:00Z')
  const db = createD1()
  const media = memoryKV()
  const net = fakeFetch({ github: options.githubStatus })
  const env: Env = {
    DB: db,
    MEDIA: media,
    ASSETS: { fetch: async () => new Response('<!doctype html><title>admin</title>', { headers: { 'Content-Type': 'text/html' } }) },
    SITE_URL: 'https://dobrolinski.pl',
    ADMIN_ORIGIN: ORIGIN,
    MAIL_FROM: 'CMS <cms@test.pl>',
    MAIL_MODE: 'live',
    RESEND_API_KEY: 're_test',
    GITHUB_REPO: 'owner/repo',
    ...(options.github ? { GITHUB_TOKEN: 'ghp_test' } : {}),
    ...options.env,
  }
  // Odczyt uruchomień GitHub Actions (pulpit) może mieć własną odpowiedź; reszta przez fakeFetch.
  const fetcher: typeof fetch = (input, init) =>
    options.actionsFetch && String(input).includes('/actions/') ? options.actionsFetch(input, init) : net.fetch(input, init)
  const app = createApp({ schema, fetch: fetcher, now: () => clock })

  const iso = new Date(clock).toISOString()
  const insertUser = db.raw.prepare('INSERT INTO users (id, email, name, role, created_at, disabled) VALUES (?, ?, ?, ?, ?, 0)')
  for (const [role, email] of Object.entries(USERS)) insertUser.run(`usr_${role}`, email, role, role, iso)
  const insertEntity = db.raw.prepare(
    'INSERT INTO entities (id, kind, slug, title, draft_json, draft_rev, published_json, published_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)',
  )
  const seed = (id: string, kind: string, slug: string, title: string, data: unknown) =>
    insertEntity.run(id, kind, slug, title, JSON.stringify(data), JSON.stringify(data), iso, iso)
  seed('page_home', 'page', '', 'Główna', homePage())
  seed('global_site', 'global', 'site', 'Ustawienia strony', { phone: '123', analyticsId: 'G-1' })
  seed('cmp_banner', 'component', 'banner', 'Baner', { name: 'Baner', blockType: 'text', props: { heading: 'Baner' }, exposed: ['heading'] })
  seed('tokens', 'tokens', 'tokens', 'Tokeny', tokens)

  const api: Api = async (method, path, opts = {}) => {
    const headers: Record<string, string> = { ...opts.headers }
    if (opts.cookie) headers.Cookie = opts.cookie
    let body: BodyInit | undefined = opts.raw
    if (opts.body !== undefined) {
      body = JSON.stringify(opts.body)
      headers['Content-Type'] ??= 'application/json'
    }
    if (!['GET', 'HEAD'].includes(method)) {
      headers['X-CMS-Request'] ??= '1'
      headers.Origin ??= ORIGIN
    }
    return app.fetch(new Request(`${ORIGIN}${path}`, { method, headers, body }), env)
  }

  /** Link z ostatniego maila Resend (pole text). */
  const lastLink = () => {
    const sent = net.resend().at(-1)
    const text = (sent?.body as { text?: string } | null)?.text ?? ''
    return /https?:\/\/\S+/.exec(text)?.[0] ?? null
  }

  async function requestLink(email: string, ip = '203.0.113.1') {
    return app.fetch(new Request(`${ORIGIN}/api/auth/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip },
      body: JSON.stringify({ email }),
    }), env)
  }

  /** Jak przeglądarka: GET pokazuje stronę z przyciskiem, dopiero POST formularza loguje. */
  async function verify(link: string) {
    const url = new URL(link)
    const page = await app.fetch(new Request(`${ORIGIN}${url.pathname}${url.search}`), env)
    if (page.status !== 200) return page
    return app.fetch(new Request(`${ORIGIN}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Origin': ORIGIN },
      body: new URLSearchParams({ token: url.searchParams.get('token') ?? '' }).toString(),
    }), env)
  }

  const cookieFrom = (response: Response) => (response.headers.get('Set-Cookie') ?? '').split(';')[0]!

  /** Pełna ścieżka: link mailem → verify → cookie. */
  async function login(role: Role, ip?: string): Promise<string> {
    await requestLink(USERS[role], ip ?? `198.51.100.${Object.keys(USERS).indexOf(role) + 1}`)
    const link = lastLink()
    if (!link) throw new Error('no login link sent')
    const response = await verify(link)
    if (response.status !== 303 || response.headers.get('Location') !== '/admin/') throw new Error('login failed')
    return cookieFrom(response)
  }

  return {
    env, db, media, net, app, api, login, requestLink, verify, lastLink, cookieFrom,
    advance: (ms: number) => { clock += ms },
  }
}

export type Harness = ReturnType<typeof setup>

export async function body<T = Record<string, unknown>>(response: Response): Promise<T> {
  return await response.json() as T
}
