export default defineNuxtConfig({
  compatibilityDate: '2026-10-04',
  devtools: { enabled: false },
  modules: ['@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      // GTM ładuje się dopiero po zgodzie (app/plugins/analytics.client.ts).
      gtmId: 'GTM-TR8MDG8W',
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'pl' },
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
      title: 'Damian Dobroliński | Ludzie · Sprzedaż · Marketing · Technologia',
      meta: [
        {
          name: 'description',
          content: 'Damian Dobroliński — Ludzie · Sprzedaż · Marketing · Technologia',
        },
        { name: 'theme-color', content: '#080808' },
        { property: 'og:type', content: 'profile' },
        { property: 'og:locale', content: 'pl_PL' },
        { property: 'og:title', content: 'Damian Dobroliński' },
        {
          property: 'og:description',
          content: 'Ludzie · Sprzedaż · Marketing · Technologia',
        },
        { property: 'og:url', content: 'https://dobrolinski.pl/' },
        { property: 'og:image', content: 'https://dobrolinski.pl/og-home.png' },
        { property: 'og:image:type', content: 'image/png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Damian Dobroliński' },
        {
          name: 'twitter:description',
          content: 'Ludzie · Sprzedaż · Marketing · Technologia',
        },
        { name: 'twitter:image', content: 'https://dobrolinski.pl/og-home.png' },
      ],
      link: [
        { rel: 'canonical', href: 'https://dobrolinski.pl/' },
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      ],
    },
  },
  nitro: {
    preset: 'static',
    prerender: {
      crawlLinks: true,
      routes: ['/', '/poznaj-czlowieka'],
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
