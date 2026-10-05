# Mapa modułów

| Funkcja | Widok | Logika | Dane | Style | Test |
|---|---|---|---|---|---|
| Strony i przejścia | `app.vue` (`NuxtPage`), `pages/index.vue`, `pages/poznaj-czlowieka.vue` | routing Nuxt | — | `motion.css` (`.view-*`) | build statyczny |
| Główny ekran | `HomeView.vue` | `useSiteExperience.ts` | `site.ts` | `experience.css` | `site-content.test.ts` |
| Myśli i obszary | `ThoughtDisplay.vue`, `ExpertiseNav.vue` | `useSiteExperience.ts` | `site.ts` | `experience.css` | `site-content.test.ts` |
| Aktualny projekt na głównej | `CurrentProjectLink.vue` | `NuxtLink` → `/poznaj-czlowieka` | `workshop.ts` (`index`, `hero.lead`) | `experience.css`, `responsive.css` | `site-content.test.ts` |
| Warsztat: pierwszy ekran | `WorkshopView.vue`, `WorkshopHero.vue` | Escape → `/` | `workshop.ts` (`hero`) | `workshop.css` | `site-content.test.ts` |
| Warsztat: sekcje | `WorkshopManifest.vue` (manifest + bez skryptu), `WorkshopProgram.vue`, `WorkshopBeliefs.vue` (krótkie myśli), `WorkshopParts.vue` (4 części + Wasze historie), `WorkshopAbout.vue`, `WorkshopAudience.vue`, `WorkshopProcess.vue` (współpraca, na tym warsztacie, cena), `WorkshopClosing.vue` (z epilogiem) | `useReveal.ts` | `workshop.ts` | `workshop-sections.css`, `workshop-chapters.css` | `site-content.test.ts` |
| Światło kursora | `app.vue` | `usePointerLight.ts` | — | `base.css` | weryfikacja DOM/manualna |
| Intro | `IntroReveal.vue` | CSS animation | — | `motion.css` | reduced-motion/manualna |
| SEO | `nuxt.config.ts` (główna), `pages/poznaj-czlowieka.vue` (`useSeoMeta`) | — | Schema.org w `site.ts`, `workshop.seo` | — | `sitemap.xml` w teście + build |
| Zgoda i statystyki | `ConsentBanner.vue` | `useAnalyticsConsent.ts`, `plugins/analytics.client.ts` | `site.ts` (`consent`), `nuxt.config.ts` (`gtmId`) | `consent.css` | `site-content.test.ts` + DOM |
| Oferta warsztatu (pod PDF, niewyświetlana) | — | — | `workshop-offer.ts` (`workshopOfferPages`) | — | `site-content.test.ts` |
| Oferta e-mailem (formularz → mail z PDF) | `WorkshopOfferForm.vue` (w `WorkshopProcess.vue`, pod ceną) | `useOfferForm.ts`, endpoint `offer-worker/` (Cloudflare Worker + Resend), kontrakt `shared/offer.ts` | `workshop.ts` (`offer`), `offer-worker/src/templates.ts`, `public/oferta/poznaj-czlowieka.pdf` | `workshop-offer.css` | `offer-worker.test.ts`; `docs/OFFER-AUTOMATION.md` |
