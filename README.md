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
- `app/content/workshop.ts` — treści, SEO, adres i dane produktu warsztatu POZNAJ CZŁOWIEKA (cena regularna)
- `app/content/workshop-offer.ts` — układ 6-stronicowej oferty PDF (bez ceny pilotażowej: repo jest publiczne)
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

Pomiar kliknięć: po zgodzie `app/plugins/analytics.client.ts` zamienia kliknięcie elementu z `data-track` w zdarzenie `dataLayer` `track_click` (`track_name`, `track_place`, `link_url`, logika w `app/utils/clickTracking.ts`). W GTM (wersja 3) działa na to jeden wyzwalacz `CE - track_click` i tag `GA4 - Event - track_click`, którego nazwa zdarzenia to `track_name`. Nowy element do pomiaru wymaga tylko atrybutu `data-track`, bez zmian w GTM.

Wartości atrybutów:

| `data-track` | `data-track-place` | Element |
|---|---|---|
| `open_project` | — | blok „Teraz / 01 / POZNAJ CZŁOWIEKA” na głównej |
| `workshop_cta` | `hero`, `closing` | „Porozmawiajmy…” na stronie warsztatu (mailto) |
| `email_click` | `home`, `workshop-topbar`, `workshop-closing` | kliknięcie adresu e-mail |
| `phone_click` | `home`, `workshop-topbar` | kliknięcie numeru telefonu |
| `back_home` | `back`, `brand` | powrót z warsztatu na główną |

Wartość `data-track` jest jednocześnie proponowaną nazwą zdarzenia GA4.

## Adresy i build

`nuxt generate` prerenderuje `/` i `/poznaj-czlowieka` jako `index.html` i `poznaj-czlowieka.html` (`autoSubfolderIndex: false`, bez osobnych `_payload.json`), więc GitHub Pages serwuje `/poznaj-czlowieka` bez przekierowania na ukośnik. Nowy adres dopisz też do `public/sitemap.xml`; test pilnuje obu obecnych.

## Bezpieczeństwo linków

Jedyny link zewnętrzny otwierany w nowej karcie ma `rel="noopener noreferrer"`. Projekt nie wymaga sekretów ani zmiennych środowiskowych do działania.
