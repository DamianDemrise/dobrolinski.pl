import { isValidEmail, normalizeEmail, type OfferResponse, type OfferSource } from '#shared/offer'
import { trackEventPayload } from '~/utils/clickTracking'

export type OfferFormState = 'idle' | 'sending' | 'sent' | 'error'
export type OfferFieldError = 'empty' | 'invalid' | null

const REQUEST_TIMEOUT_MS = 15000

/** Zdarzenia formularza do GA4: tylko nazwa i miejsce, nigdy adres. */
export function trackOffer(name: 'offer_form_view' | 'offer_form_submit' | 'offer_form_success' | 'offer_form_error', place = 'offer') {
  if (useAnalyticsConsent().choice.value !== 'granted') return
  window.dataLayer?.push(trackEventPayload(name, place))
}

function currentSource(): OfferSource {
  const params = new URLSearchParams(window.location.search)
  const source: OfferSource = { page: window.location.pathname }
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign'] as const) {
    const value = params.get(key)
    if (value) source[key] = value
  }
  return source
}

export const useOfferForm = () => {
  const { offerEndpoint } = useRuntimeConfig().public
  const email = ref('')
  const website = ref('')
  const state = ref<OfferFormState>('idle')
  const fieldError = ref<OfferFieldError>(null)
  let shownAt = 0

  const markShown = () => {
    shownAt = Date.now()
  }

  const fail = (place: string) => {
    state.value = 'error'
    trackOffer('offer_form_error', place)
  }

  const submit = async () => {
    // Blokada podwójnego wysłania: drugi klik w trakcie albo po sukcesie nic nie robi.
    if (state.value === 'sending' || state.value === 'sent') return
    const address = normalizeEmail(email.value)
    fieldError.value = !address ? 'empty' : isValidEmail(address) ? null : 'invalid'
    if (fieldError.value) {
      trackOffer('offer_form_error', 'offer-validation')
      return
    }

    state.value = 'sending'
    trackOffer('offer_form_submit')
    try {
      const response = await fetch(offerEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: address,
          website: website.value,
          elapsed: shownAt ? Date.now() - shownAt : 0,
          source: currentSource(),
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      const result = await response.json().catch(() => null) as OfferResponse | null
      if (response.ok && result?.ok) {
        state.value = 'sent'
        trackOffer('offer_form_success')
        return
      }
      if (result && !result.ok && result.error === 'invalid_email') {
        state.value = 'idle'
        fieldError.value = 'invalid'
        trackOffer('offer_form_error', 'offer-validation')
        return
      }
      fail(response.status === 429 ? 'offer-limit' : 'offer-server')
    }
    catch {
      fail('offer-network')
    }
  }

  return { enabled: Boolean(offerEndpoint), email, website, state, fieldError, markShown, submit }
}
