/**
 * Konfiguracja endpointu. Sekret (RESEND_API_KEY) przychodzi wyłącznie
 * ze zmiennych Workera (`wrangler secret put`), nigdy z repo ani z requestu.
 */

/** Minimalny interfejs Workers KV, bez zależności od @cloudflare/workers-types. */
export interface KVStore {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
}

export interface Env {
  OFFER_KV: KVStore
  RESEND_API_KEY?: string
  /** dry: nic nie wysyła; test: wszystko idzie na TEST_RECIPIENT; live: do odbiorcy. */
  MAIL_MODE?: string
  MAIL_FROM?: string
  MAIL_REPLY_TO?: string
  NOTIFICATION_EMAIL?: string
  TEST_RECIPIENT?: string
  /** Lista originów rozdzielona przecinkami, np. "https://dobrolinski.pl". */
  ALLOWED_ORIGINS?: string
  PDF_URL?: string
  DAILY_LIMIT?: string
}

export type MailMode = 'dry' | 'test' | 'live'

export const DEFAULTS = {
  from: 'Damian Dobroliński <oferta@dobrolinski.pl>',
  replyTo: 'damian@dobrolinski.pl',
  notification: 'damian@dobrolinski.pl',
  origins: 'https://dobrolinski.pl',
  pdfUrl: 'https://dobrolinski.pl/oferta/poznaj-czlowieka.pdf',
  pdfFilename: 'poznaj-czlowieka-damian-dobrolinski.pdf',
  /** Ofert na dobę; każda to 2 maile, a darmowy Resend ma 100 maili dziennie. */
  dailyLimit: 40,
} as const

export const LIMITS = {
  bodyBytes: 2048,
  /** Szybciej człowiek nie wpisze adresu i nie kliknie. */
  minElapsedMs: 1500,
  ipPerHour: 5,
  /** Ten sam adres: raz na 10 minut, najwyżej 3 razy na dobę. */
  emailCooldownMs: 10 * 60 * 1000,
  emailPerDay: 3,
  providerTimeoutMs: 8000,
} as const

export function mailMode(env: Env): MailMode {
  if (env.MAIL_MODE === 'live') return 'live'
  if (env.MAIL_MODE === 'test' && env.TEST_RECIPIENT) return 'test'
  return 'dry'
}

export function allowedOrigins(env: Env): string[] {
  return (env.ALLOWED_ORIGINS ?? DEFAULTS.origins)
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
}
