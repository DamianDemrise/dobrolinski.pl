/** Formatowanie w panelu: daty, rozmiary, statusy i komunikaty błędów API. */
import type { EntityStatus } from '@demrise/cms-core'
import { CmsError } from '@demrise/cms-core'
import { CmsApiError } from './api'

const dateFormat = new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium', timeStyle: 'short' })

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : dateFormat.format(d)
}

/** Polska odmiana liczebnika: plural(2, ['strona', 'strony', 'stron']) → '2 strony'. */
export function plural(n: number, [one, few, many]: [string, string, string]): string {
  const mod10 = n % 10
  const mod100 = n % 100
  const word = n === 1 ? one : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? few : many
  return `${n} ${word}`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export const STATUS_LABELS: Record<EntityStatus, { label: string, tone: 'success' | 'warning' | 'neutral' }> = {
  published: { label: 'Opublikowana', tone: 'success' },
  changed: { label: 'Zmiany robocze', tone: 'warning' },
  draft: { label: 'Nieopublikowana', tone: 'neutral' },
}

const API_MESSAGES: Record<string, string> = {
  forbidden: 'Brak uprawnień do tej zmiany',
  invalid: 'Dane nie przeszły walidacji',
  conflict: 'Ktoś zapisał nowszą wersję',
  not_found: 'Nie znaleziono',
  csrf: 'Odrzucono zapis (ochrona CSRF). Odśwież panel.',
  unauthorized: 'Sesja wygasła. Zaloguj się ponownie.',
  session_expired: 'Sesja wygasła. Zaloguj się ponownie.',
  too_large: 'Plik albo dane są za duże',
  unsupported_type: 'Nieobsługiwany typ pliku (JPG, PNG, WebP, AVIF, GIF)',
  not_published: 'Ta treść nie była jeszcze publikowana',
  unpublished_component: 'Strona używa komponentu globalnego, który nie jest opublikowany',
  in_use: 'Element jest używany',
  internal: 'Błąd serwera',
}

/** Czytelny komunikat z błędu API, CmsError rdzenia albo sieci. */
export function errorMessage(error: unknown): string {
  if (error instanceof CmsApiError) {
    const body = error.body as (Record<string, unknown> & { issues?: { path: string, message: string }[] }) | null
    let message = API_MESSAGES[error.code] ?? (typeof body?.message === 'string' ? body.message : `Błąd ${error.status}`)
    if (Array.isArray(body?.issues) && body.issues.length) {
      message += `: ${body.issues.slice(0, 3).map(i => `${i.path} – ${i.message}`).join('; ')}`
    }
    if (Array.isArray(body?.missing) && body.missing.length) message += ` (${(body.missing as string[]).join(', ')})`
    if (Array.isArray(body?.refs) && body.refs.length) message += `: ${(body.refs as unknown[]).map(String).join(', ')}`
    return message
  }
  if (error instanceof CmsError) return error.message
  if (error instanceof TypeError) return 'Brak połączenia z serwerem'
  return error instanceof Error ? error.message : String(error)
}
