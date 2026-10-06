# Mapa modułów

| Funkcja | Widok | Logika | Dane | Style | Test |
|---|---|---|---|---|---|
| Strony i przejścia | `app.vue` (`NuxtPage`), `pages/*.vue` → `app/cms/CmsPageView.ts` (layout wg `page.layout`) | routing Nuxt, `useCmsPage(slug)` | `content/published.json` | `motion.css` (`.view-*`) | `cms.test.ts` + `scripts/regression-html.mjs` |
| Główny ekran | `HomeView.vue` (obszary `identity`, `footer`), bloki `HomeStage.vue`, `SiteFooter.vue` | `useSiteExperience.ts` | global `site`, komponent `site-footer` | `experience.css` | `site-content.test.ts` |
| Myśli i obszary | `ThoughtDisplay.vue`, `ExpertiseNav.vue` (w `HomeStage.vue`) | `useSiteExperience.ts` | global `site` (`areas`, `thoughts`) | `experience.css` | `site-content.test.ts` |
| Aktualny projekt na głównej | `CurrentProjectLink.vue` (blok `current-project`), `ContactLinks.vue` (komponent `contact-links`) | `NuxtLink` → `workshop.path` | blok + global `workshop` | `experience.css`, `responsive.css` | `site-content.test.ts` |
| Warsztat: pierwszy ekran | `WorkshopView.vue` (obszary `hero`, `main`, `back`), `WorkshopHero.vue`, `BackLink.vue` | Escape → `/`, `useWorkshopNav.ts` | blok `workshop-hero`, globale `site`, `workshop` | `workshop.css` | `site-content.test.ts` |
| Warsztat: sekcje | `WorkshopManifest`, `WorkshopProgram`, `WorkshopBeliefs`, `WorkshopParts`, `WorkshopAbout`, `WorkshopAudience`, `WorkshopProcess`, `WorkshopClosing` (bloki `workshop-*`, props w `data`) | `useReveal.ts` | `content/published.json` | `workshop-sections.css`, `workshop-chapters.css` | `site-content.test.ts` |
| Światło kursora | `app.vue` | `usePointerLight.ts` | — | `base.css` | weryfikacja DOM/manualna |
| Intro | `IntroReveal.vue` | CSS animation | — | `motion.css` | reduced-motion/manualna |
| SEO | `app/cms/seo.ts` (`seoHead`), `nuxt.config.ts` (app.head = SEO strony głównej, też 404/200), `useCmsPageHead` w stronach | — | `page.seo` w `content/published.json`, Person z globalu `site` (`cms/derive.ts`) | — | `cms.test.ts`, regresja HTML |
| Zgoda i statystyki | `ConsentBanner.vue` | `useAnalyticsConsent.ts`, `plugins/analytics.client.ts` | global `site.consent`, `nuxt.config.ts` (`gtmId`) | `consent.css` | `site-content.test.ts` + DOM |
| Oferta warsztatu (pod PDF, niewyświetlana) | — | — | `app/content/workshop-offer.ts` (dostęp do `content/published.json`) | — | `site-content.test.ts` |
| Oferta e-mailem (formularz → mail z PDF) | `WorkshopOfferForm.vue` (w `WorkshopClosing.vue`, copy z bloku `workshop-closing.offer`) | `useOfferForm.ts`, endpoint `offer-worker/` (Cloudflare Worker + Resend), kontrakt `shared/offer.ts` | blok `workshop-closing`, `offer-worker/src/templates.ts`, `public/oferta/poznaj-czlowieka.pdf` | `workshop-offer.css` | `offer-worker.test.ts`; `docs/OFFER-AUTOMATION.md` |
| CMS: model treści | — | `cms/schema.ts` (bloki, globale, layouty, SEO), `cms/regions.ts`, `cms/derive.ts` | `cms/types.ts`, `content/published.json` | — | `cms.test.ts` |
| CMS: integracja Nuxt | `app/cms/CmsBlocks.ts` (renderer), `CmsPageView.ts` | `context.ts` (`CMS_EDIT_CONTEXT`, `useCmsPage`, `useCmsGlobals`), `directive.ts` (`v-cms`), `registry.ts` | `published.ts` (import statyczny) | `cms.css` (`.cms-hide-*`) | `cms.test.ts` |
| CMS: tokeny | — | `scripts/cms-tokens.mjs`, mapa `cms/tokens-css.json` | `tokens` w `content/published.json` → `tokens.css` (generowany) | `tokens.css` | `cms.test.ts` |
| CMS: build | — | `scripts/cms-pull.mjs` (Actions przed generate), `scripts/cms-build-admin.mjs`, `scripts/regression-html.mjs` | API `dobrolinski-cms` | — | `npm run test:regression` |
