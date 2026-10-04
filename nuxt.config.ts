export default defineNuxtConfig({
  compatibilityDate: '2026-10-04',
  devtools: { enabled: false },
  modules: ['@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      script: [
  {
    innerHTML: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-TR8MDG8W');`,
  },
],
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
