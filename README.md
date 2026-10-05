# dobrolinski.pl

Interaktywna, jednoekranowa wizytówka Damiana Dobrolińskiego. Projekt migruje pierwotne V0 z pojedynczego pliku HTML do Nuxt 4 + TypeScript, zachowując jego spokojny, minimalistyczny charakter.

## Uruchomienie

Wymagany jest Node.js 22 lub nowszy.

```bash
npm install
npm run dev
```

Kontrola jakości:

```bash
npm run check
npm run generate
```

Statyczny rezultat powstaje w `.output/public`.

## Struktura

- `app/pages/` — `/` (strona główna) i `/poznaj-czlowieka` (warsztat)
- `app/components/` — elementy strony głównej i sekcje warsztatu
- `app/composables/` — myśli i obszary, światło kursora, wejście sekcji, zgoda
- `app/content/site.ts` — treści strony głównej i Schema.org
- `app/content/workshop.ts` — treści, SEO i adres warsztatu POZNAJ CZŁOWIEKA
- `app/assets/css/` — baza, interfejs, ruch i responsywność
- `public/` — favicon, Open Graph, robots, sitemap i CNAME
- `legacy/index.v0.html` — zachowany oryginał wizualny
- `tests/` — szybkie testy kontraktu treści i metadanych

Dokładne granice modułów opisuje `MODULE_MAP.md`.

## Dostępność

Obszary są prawdziwymi przyciskami i działają z klawiaturą oraz dotykiem. Ze strony warsztatu wraca się linkiem „Wróć”, imieniem w pasku albo klawiszem `Escape`. Zmiany myśli są komunikowane przez `aria-live`, fokus pozostaje widoczny, a `prefers-reduced-motion` wyłącza intro i skraca pozostały ruch.

## Publikacja

Produkcja działa na GitHub Pages. Każdy push do `main` uruchamia `.github/workflows/deploy.yml`: `npm run generate` i publikację `.output/public` (Node.js 22). Domena `dobrolinski.pl` jest ustawiona przez `public/CNAME` i rekordy A GitHub Pages.

Zmiany rób na osobnej gałęzi i merguj do `main` dopiero po akceptacji podglądu, bo merge oznacza wdrożenie.

## Search Console i analityka

Search Console można podłączyć bez zmian architektury. Preferowana jest weryfikacja domenowa przez rekord DNS. Jeśli potrzebny będzie znacznik HTML, należy dodać prawdziwą wartość `google-site-verification` do `app.head.meta` w `nuxt.config.ts`; repo celowo nie zawiera fikcyjnego tokenu.

Statystyki: GTM `GTM-TR8MDG8W` z jednym tagiem GA4. Identyfikator jest w `runtimeConfig.public.gtmId` w `nuxt.config.ts` (nadpisywalny przez `NUXT_PUBLIC_GTM_ID`).

GTM ładuje się dopiero po zgodzie odwiedzającego (tryb podstawowy Consent Mode v2):

- `app/plugins/analytics.client.ts` ustawia domyślnie wszystkie zgody na `denied`;
- `app/composables/useAnalyticsConsent.ts` zapamiętuje decyzję w `localStorage` i ładuje GTM po „Zgoda”;
- `app/components/ConsentBanner.vue` pokazuje panel, a po decyzji mały przycisk „Cookies” do jej zmiany; odrzucenie usuwa ciasteczka `_ga*`.

Nowe tagi reklamowe w GTM wymagają rozszerzenia panelu o zgody `ad_*`.

Do pomiaru kliknięć w GTM (wyzwalacz „Kliknięcie — wszystkie elementy”, warunek na selektor CSS) linki mają atrybuty:

| `data-track` | `data-track-place` | Element |
|---|---|---|
| `home-project` | — | blok „Teraz / 01 / POZNAJ CZŁOWIEKA” na głównej |
| `workshop-cta` | `hero`, `closing` | „Porozmawiajmy…” na stronie warsztatu (mailto) |
| `mail` | `home`, `workshop-topbar`, `workshop-closing` | kliknięcie adresu e-mail |
| `phone` | `home`, `workshop-topbar` | kliknięcie numeru telefonu |
| `back-home` | `back`, `brand` | powrót z warsztatu na główną |

## Adresy i build

`nuxt generate` prerenderuje `/` i `/poznaj-czlowieka` jako `index.html` i `poznaj-czlowieka.html` (`autoSubfolderIndex: false`, bez osobnych `_payload.json`), więc GitHub Pages serwuje `/poznaj-czlowieka` bez przekierowania na ukośnik. Nowy adres dopisz też do `public/sitemap.xml`; test pilnuje obu obecnych.

## Bezpieczeństwo linków

Jedyny link zewnętrzny otwierany w nowej karcie ma `rel="noopener noreferrer"`. Projekt nie wymaga sekretów ani zmiennych środowiskowych do działania.
