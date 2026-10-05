# Mapa modułów

| Funkcja | Widok | Logika | Dane | Style | Test |
|---|---|---|---|---|---|
| Strony i przejścia | `app.vue` (`NuxtPage`), `pages/index.vue`, `pages/poznaj-czlowieka.vue` | routing Nuxt | — | `motion.css` (`.view-*`) | build statyczny |
| Główny ekran | `HomeView.vue` | `useSiteExperience.ts` | `site.ts` | `experience.css` | `site-content.test.ts` |
| Myśli i obszary | `ThoughtDisplay.vue`, `ExpertiseNav.vue` | `useSiteExperience.ts` | `site.ts` | `experience.css` | `site-content.test.ts` |
| Aktualny projekt na głównej | `CurrentProjectLink.vue` | `NuxtLink` → `/poznaj-czlowieka` | `workshop.ts` (`index`, `hero.lead`) | `experience.css`, `responsive.css` | `site-content.test.ts` |
| Warsztat: pierwszy ekran | `WorkshopView.vue`, `WorkshopHero.vue` | Escape → `/` | `workshop.ts` (`hero`) | `workshop.css` | `site-content.test.ts` |
| Warsztat: sekcje | `WorkshopManifest.vue`, `WorkshopNoScript.vue`, `WorkshopProgram.vue`, `WorkshopAbout.vue`, `WorkshopAudience.vue`, `WorkshopClosing.vue` | `useReveal.ts` | `workshop.ts` | `workshop-sections.css` | `site-content.test.ts` |
| Światło kursora | `app.vue` | `usePointerLight.ts` | — | `base.css` | weryfikacja DOM/manualna |
| Intro | `IntroReveal.vue` | CSS animation | — | `motion.css` | reduced-motion/manualna |
| SEO | `nuxt.config.ts` (główna), `pages/poznaj-czlowieka.vue` (`useSeoMeta`) | — | Schema.org w `site.ts`, `workshop.seo` | — | `sitemap.xml` w teście + build |
| Zgoda i statystyki | `ConsentBanner.vue` | `useAnalyticsConsent.ts`, `plugins/analytics.client.ts` | `site.ts` (`consent`), `nuxt.config.ts` (`gtmId`) | `consent.css` | `site-content.test.ts` + DOM |
