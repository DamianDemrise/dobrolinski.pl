# dobrolinski.pl

Minimalistyczna, statycznie generowana wizytówka Damiana Dobrolińskiego.

## Stos

- Nuxt 4, Vue 3, TypeScript
- CSS i Vue transitions; bez biblioteki animacji
- statyczny output w `.output/public`

## Komendy

- `npm run dev` — lokalny podgląd
- `npm run check` — lint, typecheck i testy
- `npm run generate` — produkcyjny build statyczny

## Granice

- Nie dodawaj trackingu, sekretów ani tokenów Search Console do repo.
- Nie zmieniaj hostingu, DNS ani `CNAME` bez wyraźnej zgody.
- Zachowuj pojedynczy viewport, dostępność i spokojny charakter ruchu.
- Treści są w `app/content/site.ts`, zachowanie w composables, wygląd w CSS.

Zacznij od `MODULE_MAP.md`, a dokumentację sprawdź w `DOCS_INDEX.md`.
