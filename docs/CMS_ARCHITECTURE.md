# DEMRISE CMS v1: architektura (dobrolinski.pl)

dobrolinski.pl jest pierwszą stroną na DEMRISE CMS. Kod CMS (rdzeń, Worker, runtime Nuxt, panel) mieszka w prywatnym repo `demrise-pl/demrise-cms`, podpiętym tu jako submoduł git w `vendor/demrise-cms`. Wspólna architektura (zasada, model danych, draft/publikacja/rewizje, uprawnienia, API, migracje, build): `vendor/demrise-cms/docs/ARCHITECTURE.md`. Podłączenie i aktualizacja submodułu: `vendor/demrise-cms/README.md`.

Tu jest tylko to, co dotyczy tej strony.

## Decyzje dla tej strony

| Obszar | Na dobrolinski.pl | Powód |
|---|---|---|
| Publiczny frontend | statyczny na GitHub Pages (`DamianDemrise/dobrolinski.pl`, workflow Deploy) | zero zmian hostingu, ta sama wydajność |
| Backend CMS | Cloudflare Worker `dobrolinski-cms` (`cms-worker/wrangler.toml`), panel pod `https://dobrolinski-cms.demrise.workers.dev/admin/` | konto, wrangler i Resend już działają przy formularzu oferty; darmowy plan wystarcza |
| Dane | D1 `dobrolinski-cms`, media w KV (binding `MEDIA`) | jak w architekturze CMS |
| Repo → panel | workflow `cms-sync` woła `POST https://dobrolinski-cms.demrise.workers.dev/api/sync/pull`, zapas: cron `17 * * * *` | jak w architekturze CMS |
| Kod CMS | submoduł `vendor/demrise-cms` (prywatny); CI pobiera go kluczem `DEMRISE_CMS_DEPLOY_KEY` w wersji zapisanej w tym repo | jedna kopia CMS dla wszystkich stron DEMRISE |

## Układ repo

```
vendor/demrise-cms/      DEMRISE CMS (submoduł): core/, worker/, runtime/, nuxt/ (panel), scripts/, docs/
cms/                     kontrakt tej strony: schemat bloków i globali, regiony, typy, trasy, adresy stron, dane pochodne, mapa tokenów
app/cms/                 integracja tej strony: registry.ts (typ bloku → komponent), CmsPageView.ts (layout → widok), published.ts (snapshot), index.ts
app/components/          komponenty bloków i widoki layoutów tej strony
content/published.json   snapshot opublikowanej treści (źródło buildu publicznego)
cms-worker/              Worker tej strony: src/index.ts (createApp z vendor + schemat + układ repo), wrangler.toml, migrations/ (pełna historia D1), drafts/, scripts/seed.mjs
scripts/                 cms-tokens.mjs, cms-pull.mjs (ścieżki tej strony), regression-html.mjs (lista stron tej strony)
offer-worker/            formularz oferty (zapisuje licznik form_events w D1 CMS)
```

Aliasy: `@demrise/cms-core` → `vendor/demrise-cms/core/src/index.ts` (nuxt.config, vitest, tsconfig, `cms-worker/wrangler.toml`), `@demrise/cms-runtime/*` → `vendor/demrise-cms/runtime/*` (nuxt.config, vitest), `#cms-admin/*` → `vendor/demrise-cms/nuxt/app/*` (warstwa panelu, vitest), `~~` → korzeń strony (Nuxt, vitest, `cms-worker/tsconfig.json`, alias `~~` w `wrangler.toml`).

`nuxt.config.ts` dołącza warstwę `vendor/demrise-cms/nuxt` tylko przy `CMS_ADMIN=1`, więc publiczny build nie zawiera kodu panelu.

## Migracje D1

`cms-worker/migrations/` ma pełną historię produkcyjnej bazy: kopie migracji ogólnych z `vendor/demrise-cms/worker/migrations/` (`0001_init`, `0003_form_events`, `0005_repo_sync`) i treść startową tej strony (`0002_seed`, `0004_seed_ebook_page`). Nowa migracja ogólna: najpierw w repo CMS, potem kopia z tym samym numerem tutaj.

## Build

- Publiczny: `npm run generate` (bez `CMS_ADMIN`). CI: checkout repo bez submodułów, checkout `demrise-pl/demrise-cms` do `vendor/demrise-cms` na commicie z `git ls-tree HEAD vendor/demrise-cms`, `npm run cms:tokens`, `npm run generate`.
- Panel: `npm run cms:build` → `cms-worker/admin-dist` → `npx wrangler deploy` w `cms-worker/`.
- Regresja HTML: `npm run test:regression` (baseline w `../dobrolinski-cms-baseline/public`).
