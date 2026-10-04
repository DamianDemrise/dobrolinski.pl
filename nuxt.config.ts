export default defineNuxtConfig({
  compatibilityDate: '2026-10-04',
  devtools: { enabled: false },
  modules: ['@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'pl' },
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
      title: 'Damian Dobroliński',
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
        { property: 'og:image', content: 'https://dobrolinski.pl/og-image.png' },
        { property: 'og:image:type', content: 'image/png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Damian Dobroliński' },
        {
          name: 'twitter:description',
          content: 'Ludzie · Sprzedaż · Marketing · Technologia',
        },
        { name: 'twitter:image', content: 'https://dobrolinski.pl/og-image.png' },
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
      routes: ['/'],
    },
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
})
