export type ConsentChoice = 'granted' | 'denied'

type Gtag = (...args: unknown[]) => void

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: Gtag
  }
}

const STORAGE_KEY = 'dobrolinski-consent-v1'

const readStoredChoice = (): ConsentChoice | null => {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value === 'granted' || value === 'denied' ? value : null
  }
  catch {
    return null
  }
}

const storeChoice = (choice: ConsentChoice) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, choice)
  }
  catch {
    // Brak dostępu do storage: decyzja obowiązuje do końca wizyty.
  }
}

const ensureGtag = (): Gtag => {
  window.dataLayer = window.dataLayer || []
  window.gtag = window.gtag || function gtag() {
    // gtag wymaga obiektu arguments, nie tablicy.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments)
  }
  return window.gtag
}

const removeAnalyticsCookies = () => {
  const domain = window.location.hostname.replace(/^www\./, '')
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0]?.trim()
    if (!name || !/^_ga/.test(name)) continue
    for (const scope of ['', `; domain=${domain}`, `; domain=.${domain}`]) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${scope}`
    }
  }
}

/**
 * Pomiar tylko z produkcji: localhost i podglądy buildu nie zaśmiecają GA4
 * (sesje z hostName „localhost” w danych 05.10.2026).
 */
export const MEASURED_HOSTS = ['dobrolinski.pl', 'www.dobrolinski.pl']
export const isMeasuredHost = (hostname: string) => MEASURED_HOSTS.includes(hostname.toLowerCase())

export const useAnalyticsConsent = () => {
  const choice = useState<ConsentChoice | null>('consent-choice', () => null)
  const panelOpen = useState('consent-panel-open', () => false)
  const gtmLoaded = useState('consent-gtm-loaded', () => false)
  const { gtmId } = useRuntimeConfig().public

  const loadGtm = () => {
    if (gtmLoaded.value || !gtmId || !isMeasuredHost(window.location.hostname)) return
    gtmLoaded.value = true
    window.dataLayer!.push({ 'gtm.start': Date.now(), 'event': 'gtm.js' })
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`
    document.head.appendChild(script)
  }

  const apply = (value: ConsentChoice) => {
    const gtag = ensureGtag()
    gtag('consent', 'update', { analytics_storage: value })
    if (value === 'granted') loadGtm()
    else removeAnalyticsCookies()
  }

  const init = () => {
    const gtag = ensureGtag()
    gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
    })
    choice.value = readStoredChoice()
    panelOpen.value = choice.value === null
    if (choice.value) apply(choice.value)
  }

  const decide = (value: ConsentChoice) => {
    choice.value = value
    panelOpen.value = false
    storeChoice(value)
    apply(value)
  }

  return {
    choice: readonly(choice),
    panelOpen,
    decide,
    init,
  }
}
