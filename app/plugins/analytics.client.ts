import { trackPayloadFrom } from '~/utils/clickTracking'

export default defineNuxtPlugin(() => {
  const { choice, init } = useAnalyticsConsent()
  init()

  // Kliknięcia trafiają do dataLayer tylko po zgodzie; bez niej GTM się nie ładuje.
  document.addEventListener('click', (event) => {
    if (choice.value !== 'granted') return
    const payload = trackPayloadFrom(event.target)
    if (payload) window.dataLayer?.push(payload)
  }, { capture: true })
})
