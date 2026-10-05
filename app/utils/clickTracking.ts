/**
 * Pomiar kliknięć: element z `data-track` zamienia się w jedno zdarzenie
 * dataLayer `track_click`. GTM ma na nie jeden wyzwalacz i jeden tag GA4,
 * a nazwa zdarzenia GA4 to wartość `data-track` (open_project, workshop_cta,
 * email_click, phone_click, back_home).
 */
export const TRACK_EVENT = 'track_click'

export interface TrackPayload {
  event: typeof TRACK_EVENT
  track_name: string
  track_place: string
  link_url: string
}

export function trackPayloadFrom(target: EventTarget | null): TrackPayload | null {
  if (!(target instanceof Element)) return null
  const el = target.closest<HTMLElement>('[data-track]')
  const name = el?.dataset.track
  if (!el || !name) return null
  return {
    event: TRACK_EVENT,
    track_name: name,
    track_place: el.dataset.trackPlace ?? '',
    link_url: el.getAttribute('href') ?? '',
  }
}
