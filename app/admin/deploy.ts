/**
 * Komunikaty o wypchnięciu strony publicznej. Publikacja zapisuje treść w CMS;
 * na dobrolinski.pl trafia dopiero po wypchnięciu (commit do repo → wdrożenie).
 */
import type { DeployRun, PendingChange } from '@demrise/cms-core'

export const PUBLISHED_MESSAGE = 'Opublikowane w CMS. Na stronie pojawi się po wypchnięciu: Panel → „Wypchnij na stronę”.'

export const CHANGE_LABELS: Record<PendingChange['change'], string> = {
  added: 'nowe',
  changed: 'zmienione',
  removed: 'zniknie ze strony',
}

/** Stan ostatniego uruchomienia workflow po polsku i z tonem plakietki. */
export function runLabel(run: DeployRun): { text: string, tone: 'success' | 'warning' | 'danger' | 'neutral' } {
  if (run.status !== 'completed') return { text: 'W trakcie', tone: 'neutral' }
  if (run.conclusion === 'success') return { text: 'Udane', tone: 'success' }
  if (run.conclusion === 'cancelled') return { text: 'Anulowane', tone: 'warning' }
  return { text: 'Błąd', tone: 'danger' }
}
