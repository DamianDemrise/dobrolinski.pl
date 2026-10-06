# DEMRISE CMS v1: migracja treści dobrolinski.pl

## Co przeniesiono

Cała treść, która wcześniej była zaszyta w `app/content/*.ts`, jest teraz w `content/published.json` (typ `PublishedSite`) i w bazie D1 jako encje:

| Encja | Zawartość |
|---|---|
| strona `''` (główna, layout `home`) | `home-stage`, `current-project`, komponenty globalne `contact-links` i `site-footer` |
| strona `poznaj-czlowieka` (layout `workshop`) | `workshop-hero`, `workshop-manifest`, `workshop-program`, `workshop-beliefs`, `workshop-parts`, `workshop-about`, `workshop-audience`, `workshop-process`, `workshop-closing` (z tekstami formularza oferty), komponent globalny `back-link` |
| strona `polityka-prywatnosci` (layout `document`) | `privacy-document`, komponent globalny `back-link` |
| global `site` | nazwisko, adres, e-mail, telefon, obszary z myślami, myśli marki, teksty zgody na cookies, dane prawne (JSON-LD Person) |
| global `workshop` | dane produktu wspólne dla kilku sekcji: numer, nazwa, tytuł, podtytuł, format, cena regularna i jej zakres, temat maila, efekty (do PDF) |
| komponenty globalne | `contact-links`, `site-footer`, `back-link` |
| tokeny | kolory, skala typografii (`--type-*`), jasności tekstu (`--ink-*`), szerokości i odstępy warsztatu, breakpointy |

Każda strona ma też pola SEO (title, description, canonical, OG, noindex) przeniesione 1:1 z `nuxt.config.ts` i `useSeoMeta`.

## Jak sprawdzono, że strona się nie zmieniła

`node scripts/regression-html.mjs` porównuje świeży `nuxt generate` z buildem sprzed migracji (`index`, `poznaj-czlowieka`, `polityka-prywatnosci`, `404`, `200`, `sitemap.xml`, `robots.txt`): DOM `<body>` identyczny po normalizacji (hashe assetów, komentarze hydracji Vue), tagi `<head>` jako zbiory. Wynik po migracji: **brak różnic**. Definicje zmiennych CSS przeniesione do `app/assets/css/tokens.css` (generowany z tokenów), zbiór deklaracji w zbudowanym CSS bez zmian poza nowymi klasami `.cms-hide-*` (używane tylko, gdy ustawiona jest widoczność per urządzenie).

## Komponenty

Sekcje dostają dane przez prop `data` z bloku zamiast importować moduły treści. Pola edytowalne mają dyrektywę `v-cms="'ścieżka'"`, która w buildzie publicznym nie dodaje żadnego atrybutu, a w edytorze ustawia `data-cms-block` i `data-cms-field`. Rejestr typ → komponent: `app/cms/registry.ts`. Renderer: `app/cms/CmsPageView.ts` i `app/cms/CmsBlocks.ts`.

`app/content/*.ts` zostały jako cienkie, tylko do odczytu widoki na `content/published.json` (dla testów i mapy oferty PDF), bez własnego tekstu.

## Źródło treści przy buildzie

1. Repo jest źródłem opublikowanej treści: `content/published.json`, `app/assets/css/tokens.css`, `public/media/`. Panel aktualizuje je commitem przy „Wypchnij na stronę”.
2. `nuxt generate` renderuje statycznie z `content/published.json` (workflow Deploy po każdym pushu do `main`).
3. Zmiana treści w kodzie (commit w `content/published.json`) wraca do panelu sama: workflow `cms-sync` → `POST /api/sync/pull`. Szczegóły: `docs/CMS_ARCHITECTURE.md`.

## Dodanie nowego edytowalnego komponentu (instrukcja dla DEMRISE)

1. Komponent Vue przyjmuje `data` (props bloku), pola oznaczone `v-cms="'klucz'"` (listy: `'lista.0.pole'`).
2. `cms/types.ts`: typ bloku w unii `BlockType`, kształt `data`.
3. `cms/regions.ts`: obszar bloku. `cms/schema.ts`: definicja pól (poziomy `safe`/`advanced`/`developer`, `inline`, ograniczenia).
4. `app/cms/registry.ts`: typ → komponent.
5. Testy: `tests/cms.test.ts` sprawdza, że rejestr pokrywa schemat i że treść przechodzi walidację.
6. Panel: `npm run cms:build` i `npx wrangler deploy` w `cms-worker/` (edytor zna nowe pola ze schematu).

## Nowa strona klienta DEMRISE

Rdzeń (`packages/cms-core`), Worker (`cms-worker`) i integracja Nuxt (`app/cms`, panel w `app/pages/admin`, `app/components/admin`, `app/admin`) są niezależne od dobrolinski.pl. Specyficzne dla strony są tylko: `cms/` (schemat, regiony, typy), rejestr komponentów, `content/published.json` i `wrangler.toml` (nazwa Workera, id D1 i KV, originy). Szczegóły: `docs/CMS_ARCHITECTURE.md`.
