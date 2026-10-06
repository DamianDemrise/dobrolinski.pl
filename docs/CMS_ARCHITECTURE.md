# DEMRISE CMS v1: architektura

Pierwsza implementacja: dobrolinski.pl. Granice są ustawione tak, żeby rdzeń dało się wydzielić jako pakiety dla stron klientów DEMRISE.

## Zasada

Kod odpowiada za to, **jak** strona wygląda i działa. CMS odpowiada za to, **co** jest na stronie.
Strona to lista bloków `{ id, type, props }`. Typ bloku wskazuje istniejący komponent Vue, a `props` to tylko pola, które definicja bloku wystawia do edycji.

## Decyzje (dlaczego tak)

| Obszar | Decyzja | Powód |
|---|---|---|
| Publiczny frontend | zostaje statyczny na GitHub Pages | zero zmian hostingu, ta sama wydajność |
| Źródło treści przy buildzie | `content/published.json` (snapshot w repo) odświeżany z API przed `nuxt generate` | build nigdy nie zależy od dostępności API; jeśli API leży, buduje się ostatni snapshot |
| Backend CMS | Cloudflare Worker `dobrolinski-cms` | konto, wrangler i Resend już działają przy formularzu oferty; darmowy plan wystarcza |
| Dane | D1 (`dobrolinski-cms`) | relacyjne dane: użytkownicy, sesje, encje, rewizje; transakcje przez `batch` |
| Media | Workers KV `CMS_MEDIA` (binaria) + metadane w D1 | R2 nie jest włączony na koncie (wymaga karty); KV do 25 MB na plik. V2: R2 |
| Panel | ta sama aplikacja Nuxt zbudowana z `CMS_ADMIN=1`, serwowana jako static assets Workera | edytor renderuje prawdziwe komponenty strony (1:1), a cookie sesji jest first-party (ten sam origin co API) |
| Auth | logowanie linkiem e-mail (Resend), sesja w D1, cookie `HttpOnly; Secure; SameSite=Strict` | bez haseł do haszowania (limit CPU darmowego Workera), brak bazy haseł do wycieku |
| Publikacja | `POST publish` zapisuje wersję opublikowaną i wyzwala workflow GitHub Pages (`repository_dispatch`), jeśli jest skonfigurowany `GITHUB_TOKEN` | strona publiczna zostaje statyczna; bez tokenu rebuild uruchamia się ręcznie (Actions → Run workflow) |

## Układ repo (przyszłe pakiety)

```
packages/cms-core/      @demrise/cms-core   typy, pola, walidacja, uprawnienia, operacje na dokumencie, rewizje, tokeny (bez frameworka)
cms-worker/             @demrise/cms-worker API, auth, D1, media, publikacja, hosting panelu
app/cms/                @demrise/nuxt       rejestr bloków, renderer, kontekst edycji, dyrektywa v-cms
app/pages/admin/        @demrise/cms-ui     panel (tylko w buildzie CMS_ADMIN=1)
app/components/admin/   @demrise/editor     edytor wizualny, inspektor, nawigator, media, SEO
cms/                    konfiguracja tej strony: definicje bloków, globali, tokenów (dobrolinski-specific)
content/published.json  snapshot opublikowanej treści (źródło buildu publicznego)
```

Rdzeń (`packages/cms-core`) nie importuje niczego z `app/`, `cms/` ani `cms-worker/`. Worker importuje rdzeń i `cms/` (definicje). Nuxt importuje rdzeń, `cms/` i snapshot.

## Model danych

Typy: `packages/cms-core/src/types.ts`. Najważniejsze:

- **Encja** (`Entity`): `page` | `global` | `component` | `pattern` | `tokens`. Ma `draft` (JSON) z licznikiem `draftRev` i `published` (JSON lub `null`).
- **Strona** (`PageDocument`): `title`, `slug`, `layout`, `seo`, `blocks[]`.
- **Blok** (`BlockInstance`): `id`, `type`, `props`, `hidden`, `visibility` (desktop/tablet/mobile z dziedziczeniem), opcjonalnie `ref` do komponentu globalnego i `overrides`.
- **Definicja bloku** (`BlockDefinition`): pola (`FieldDef[]`) z poziomem `safe` / `advanced` / `developer`, `defaults`, `variants`, `restrictions` (movable, removable, hideable, duplicable), `region`.
- **Komponent globalny** (`component`): definicja `{ blockType, props, exposed: string[] }`. Instancja na stronie: `{ type: 'global', ref, overrides }`, gdzie wolno nadpisać tylko pola z `exposed`. Zmiana definicji propaguje się do wszystkich instancji przy renderze.
- **Wzorzec** (`pattern`): zapisany zestaw bloków kopiowany jako niezależna treść (po wstawieniu nie ma związku z wzorcem).
- **Tokeny** (`tokens`): kolory, typografia, odstępy, szerokości, breakpointy. Klient wybiera nazwę tokenu, nie HEX.

## Draft, podgląd, publikacja, rewizje

```
EDYCJA → autosave do draft (PUT z baseRev; 409 przy nieaktualnej wersji) → podgląd draftu (tylko zalogowany) → PUBLISH
```

- Zapis draftu nigdy nie zmienia `published`.
- Rewizja powstaje przy publikacji, przy przywróceniu i jako punkt kontrolny autosave (najwyżej co 5 min na encję). Przywrócenie kopiuje rewizję do draftu i tworzy nową rewizję `restore`; historii nie kasuje.
- Undo/redo to historia stanów w edytorze (sesja), osobno od rewizji.

## Uprawnienia

`CONTENT_EDIT, CONTENT_PUBLISH, MEDIA_UPLOAD, MEDIA_DELETE, SEO_EDIT, DESIGN_EDIT, COMPONENT_EDIT, USERS_MANAGE, SETTINGS_MANAGE, MODE_ADVANCED, MODE_DEVELOPER`.
Role: `owner`, `editor`, `content_editor`, `developer` (`packages/cms-core/src/permissions.ts`).
Backend sprawdza uprawnienia na każdej trasie i na poziomie pól: zmiana pola `advanced` wymaga `MODE_ADVANCED`, pola `developer` wymaga `MODE_DEVELOPER`, pól SEO wymaga `SEO_EDIT`, tokenów `DESIGN_EDIT`, definicji komponentów `COMPONENT_EDIT`.

## API (Worker)

Wszystkie trasy `/api/*` poza `/api/public/*` i `/api/auth/request|verify` wymagają sesji. Zapisy wymagają nagłówka `X-CMS-Request: 1` i zgodnego `Origin`.

| Metoda i trasa | Uprawnienie | Opis |
|---|---|---|
| `POST /api/auth/request` `{email}` | publiczne, limit | zawsze 200; link wysyłany tylko istniejącemu użytkownikowi |
| `GET /api/auth/verify?token=` | publiczne | jednorazowy token (15 min) → nowa sesja → redirect `/admin/` |
| `POST /api/auth/logout` | sesja | usuwa sesję |
| `GET /api/me` | sesja | użytkownik, rola, uprawnienia |
| `GET /api/entities?kind=` | sesja | lista: id, kind, slug, title, status, updatedAt, updatedBy, seoStatus |
| `GET /api/entities/:id` | sesja | pełna encja |
| `PUT /api/entities/:id/draft` `{baseRev, data}` | CONTENT_EDIT (+ poziomy pól) | 200 `{draftRev, updatedAt}` albo 409 `{error:'conflict', entity}` |
| `POST /api/entities/:id/publish` `{expectedRev}` | CONTENT_PUBLISH | publikacja + rebuild |
| `POST /api/entities/:id/discard` | CONTENT_EDIT | draft = published |
| `GET /api/entities/:id/revisions` | sesja | lista rewizji |
| `GET /api/revisions/:rid` | sesja | rewizja |
| `POST /api/revisions/:rid/restore` | CONTENT_EDIT | przywrócenie do draftu |
| `POST /api/entities` `{kind, slug, title, data}` | COMPONENT_EDIT (component, pattern) | tworzenie |
| `DELETE /api/entities/:id` | COMPONENT_EDIT | tylko component/pattern, nieużywane |
| `GET/POST /api/media`, `PATCH/DELETE /api/media/:id`, `POST /api/media/:id/replace`, `GET /api/media/:id/usage` | sesja / MEDIA_UPLOAD / MEDIA_DELETE | biblioteka mediów |
| `GET /media/:id/:filename` | publiczne | plik |
| `GET/POST/PATCH/DELETE /api/users` | USERS_MANAGE | użytkownicy i role |
| `GET /api/settings`, `POST /api/rebuild` | SETTINGS_MANAGE / CONTENT_PUBLISH | status integracji i ręczny rebuild |
| `GET /api/public/site` | publiczne, CORS `*` | opublikowana treść (`PublishedSite`) dla buildu |

Typy żądań i odpowiedzi: `packages/cms-core/src/api.ts`.

## Build

- Publiczny: `npm run generate` (bez `CMS_ADMIN`): strony `admin/**` są ignorowane, w bundlu nie ma edytora. GitHub Actions przed `generate` uruchamia `node scripts/cms-pull.mjs` (pobiera `/api/public/site` i media; przy błędzie zostaje snapshot z repo).
- Panel: `npm run cms:build` (`CMS_ADMIN=1 nuxt generate`) → `cms-worker/admin-dist` → `npx wrangler deploy` w `cms-worker/`.
