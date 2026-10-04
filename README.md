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

- `app/components/` — niezależne elementy obu stanów widoku
- `app/composables/` — stan doświadczenia i bezwładność światła kursora
- `app/content/site.ts` — jedno źródło treści i danych Schema.org
- `app/assets/css/` — baza, interfejs, ruch i responsywność
- `public/` — favicon, Open Graph, robots, sitemap i CNAME
- `legacy/index.v0.html` — zachowany oryginał wizualny
- `tests/` — szybkie testy kontraktu treści i metadanych

Dokładne granice modułów opisuje `MODULE_MAP.md`.

## Dostępność

Obszary są prawdziwymi przyciskami i działają z klawiaturą oraz dotykiem. Stan warsztatu można zamknąć przyciskiem lub klawiszem `Escape`. Zmiany myśli są komunikowane przez `aria-live`, fokus pozostaje widoczny, a `prefers-reduced-motion` wyłącza intro i skraca pozostały ruch.

## Publikacja

Projekt jest przygotowany do statycznego hostingu, w tym Cloudflare Pages:

- komenda budowania: `npm run generate`
- katalog publikacji: `.output/public`
- wersja Node.js: `22`

Repozytorium zawiera `public/CNAME`, ale samo uruchomienie builda nie zmienia DNS ani bieżącego hostingu. Migrację produkcji należy wykonać osobno po akceptacji podglądu.

## Search Console i analityka

Search Console można podłączyć bez zmian architektury. Preferowana jest weryfikacja domenowa przez rekord DNS. Jeśli potrzebny będzie znacznik HTML, należy dodać prawdziwą wartość `google-site-verification` do `app.head.meta` w `nuxt.config.ts`; repo celowo nie zawiera fikcyjnego tokenu.

GA4/GTM i banner cookies nie są obecnie dodane. Późniejszą integrację należy umieścić w osobnym pluginie `app/plugins/analytics.client.ts`, z identyfikatorem pobieranym z konfiguracji środowiska i dopiero po ustaleniu podstawy prawnej/cookies.

## Bezpieczeństwo linków

Jedyny link zewnętrzny otwierany w nowej karcie ma `rel="noopener noreferrer"`. Projekt nie wymaga sekretów ani zmiennych środowiskowych do działania.
