import { fileURLToPath } from 'node:url'
import type { PublishedSite } from './vendor/demrise-cms/core/src/types'
import { seoMeta } from './vendor/demrise-cms/runtime/seo'
import { isUnpublishedRoute, publicRoutes } from './cms/routes'
import published from './content/published.json'

/** Build panelu CMS (`npm run cms:build`): SPA /admin, bez ponownego prerenderu stron publicznych. */
const isAdminBuild = process.env.CMS_ADMIN === '1'
const site = published as unknown as PublishedSite
const home = site.pages['']!

export default defineNuxtConfig({
  compatibilityDate: '2026-10-04',
  devtools: { enabled: false },
  // Panel DEMRISE CMS (warstwa z submodułu vendor/demrise-cms) tylko w buildzie panelu:
  // publiczny build nie zawiera tras ani kodu panelu.
  extends: isAdminBuild ? ['./vendor/demrise-cms/nuxt'] : [],
  modules: ['@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  alias: {
    '@demrise/cms-core': fileURLToPath(new URL('./vendor/demrise-cms/core/src/index.ts', import.meta.url)),
    '@demrise/cms-runtime': fileURLToPath(new URL('./vendor/demrise-cms/runtime', import.meta.url)),
  },
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
      // Strony z panelu tylko po publikacji: cms/routes.ts czyta content/published.json.
      // sitemap.xml generuje server/routes/sitemap.xml.ts z tej samej listy.
      routes: isAdminBuild ? ['/admin'] : [...publicRoutes(site), '/sitemap.xml'],
      // Linki do nieopublikowanych stron (crawlLinks) pomijamy: catch-all dałby 404.
      ignore: isAdminBuild ? [] : [(path: string) => isUnpublishedRoute(site, path)],
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
