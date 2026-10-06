/**
 * Komunikaty o wypchnięciu strony publicznej. Publikacja zapisuje treść w CMS;
 * na dobrolinski.pl trafia dopiero po wypchnięciu (przycisk na pulpicie albo GitHub Actions).
 */
import type { DeployRun, RebuildStatus } from '@demrise/cms-core'

export const REBUILD_MESSAGES: Record<RebuildStatus, string> = {
  triggered: 'Wypychanie uruchomione. Strona odświeży się w ciągu ~1–2 min.',
  manual: 'Opublikowane w CMS. Na stronie pojawi się po wypchnięciu: Panel → „Wypchnij na stronę”.',
  failed: 'Nie udało się uruchomić wypchnięcia. Spróbuj z Panelu albo w GitHub Actions (Run workflow).',
}

export const rebuildTone = (status: RebuildStatus) => (status === 'failed' ? 'adm-alert--warning' : 'adm-alert--neutral')

/** Stan ostatniego uruchomienia workflow po polsku i z tonem plakietki. */
export function runLabel(run: DeployRun): { text: string, tone: 'success' | 'warning' | 'danger' | 'neutral' } {
  if (run.status !== 'completed') return { text: 'W trakcie', tone: 'neutral' }
  if (run.conclusion === 'success') return { text: 'Udane', tone: 'success' }
  if (run.conclusion === 'cancelled') return { text: 'Anulowane', tone: 'warning' }
  return { text: 'Błąd', tone: 'danger' }
}
