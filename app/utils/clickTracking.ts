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

/**
 * Zdarzenie spoza kliknięcia (formularz oferty) w tym samym kształcie,
 * więc obecny tag GTM wysyła je do GA4 bez zmian w kontenerze.
 * Nigdy nie przekazuj tu adresu e-mail ani innych danych osobowych.
 */
export function trackEventPayload(name: string, place: string): TrackPayload {
  return { event: TRACK_EVENT, track_name: name, track_place: place, link_url: '' }
}

export type OfferFormProduct = 'offer' | 'ebook'
export type OfferFormStep = 'view' | 'submit' | 'success' | 'error'

/**
 * Zdarzenie formularza w GA4: `offer_form_<krok>` dla oferty, `ebook_form_<krok>` dla ebooka.
 * Osobne nazwy, żeby pobrania ebooka nie liczyły się jako zapytania o warsztat.
 */
export const formEventName = (product: OfferFormProduct, step: OfferFormStep) => `${product}_form_${step}`

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
