# Mapa modułów

| Funkcja | Widok | Logika | Dane | Style | Test |
|---|---|---|---|---|---|
| Główny ekran | `HomeView.vue` | `useSiteExperience.ts` | `site.ts` | `experience.css` | `site-content.test.ts` |
| Myśli i obszary | `ThoughtDisplay.vue`, `ExpertiseNav.vue` | `useSiteExperience.ts` | `site.ts` | `experience.css` | `site-content.test.ts` |
| Warsztat | `WorkshopView.vue` | `useSiteExperience.ts` | `site.ts` | `workshop.css` | `site-content.test.ts` |
| Światło kursora | `app.vue` | `usePointerLight.ts` | — | `base.css` | weryfikacja DOM/manualna |
| Intro | `IntroReveal.vue` | CSS animation | — | `motion.css` | reduced-motion/manualna |
| SEO | `app.vue`, `nuxt.config.ts` | — | Schema.org w `site.ts` | — | build statyczny |
| Zgoda i statystyki | `ConsentBanner.vue` | `useAnalyticsConsent.ts`, `plugins/analytics.client.ts` | `site.ts` (`consent`), `nuxt.config.ts` (`gtmId`) | `consent.css` | `site-content.test.ts` + DOM |
