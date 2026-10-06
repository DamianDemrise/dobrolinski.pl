import { fileURLToPath } from 'node:url'
import type { PublishedSite } from './packages/cms-core/src/types'
import { seoMeta } from './app/cms/seo'
import published from './content/published.json'

/** Build panelu CMS (`npm run cms:build`): SPA /admin, bez ponownego prerenderu stron publicznych. */
const isAdminBuild = process.env.CMS_ADMIN === '1'
const home = (published as unknown as PublishedSite).pages['']!

export default defineNuxtConfig({
  compatibilityDate: '2026-10-04',
  devtools: { enabled: false },
  modules: ['@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  alias: {
    '@demrise/cms-core': fileURLToPath(new URL('./packages/cms-core/src/index.ts', import.meta.url)),
  },
  // Publiczny build nie zawiera tras ani kodu panelu.
  ignore: isAdminBuild ? [] : ['app/pages/admin/**', 'app/components/admin/**', 'app/admin/**'],
  routeRules: isAdminBuild ? { '/admin/**': { ssr: false } } : {},
  runtimeConfig: {
    public: {
      // GTM ładuje się dopiero po zgodzie (app/plugins/analytics.client.ts).
      gtmId: 'GTM-TR8MDG8W',
      // Endpoint oferty (offer-worker/). Pusty = formularz się nie renderuje.
      // Lokalnie: NUXT_PUBLIC_OFFER_ENDPOINT=http://localhost:8787 npm run generate
      offerEndpoint: 'https://dobrolinski-oferta.demrise.workers.dev',
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'pl' },
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
      // Strona główna z CMS (content/published.json). W app.head, bo z niego korzystają też 404/200.
      title: home.seo.title,
      meta: [
        { name: 'theme-color', content: '#080808' },
        { property: 'og:locale', content: 'pl_PL' },
        ...seoMeta(home.seo, 'profile'),
      ],
      link: [
        { rel: 'canonical', href: home.seo.canonical },
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      ],
    },
  },
  nitro: {
    preset: 'static',
    prerender: {
      crawlLinks: !isAdminBuild,
      routes: isAdminBuild ? ['/admin'] : ['/', '/poznaj-czlowieka', '/polityka-prywatnosci'],
      // /poznaj-czlowieka.html zamiast /poznaj-czlowieka/index.html:
      // GitHub Pages serwuje wtedy adres bez ukośnika i bez przekierowania.
      autoSubfolderIndex: false,
    },
  },
  experimental: {
    // Strona nie pobiera danych; bez osobnych _payload.json nie powstaje katalog
    // /poznaj-czlowieka/, który na GitHub Pages przesłaniałby poznaj-czlowieka.html.
    payloadExtraction: false,
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
})
