# DEMRISE CMS v1: bezpieczeństwo

Zasada: UI ukrywa niedostępne akcje, ale o wszystkim decyduje Worker. Każdy test uprawnień uderza bezpośrednio w API (`cms-worker/test/*.test.ts`).

## Logowanie i sesja

- **Link e-mail zamiast hasła.** `POST /api/auth/request` zawsze odpowiada 200 (brak enumeracji adresów); mail wysyłany po odpowiedzi (`waitUntil`), więc czas odpowiedzi nie zdradza, czy adres istnieje.
- **Token:** 32 losowe bajty, w bazie tylko SHA-256, ważny 15 min, jednorazowy (warunkowy `UPDATE … RETURNING`, dwa równoczesne kliknięcia → loguje jedno).
- **Dwa kroki:** `GET /api/auth/verify` tylko pokazuje przycisk, token zużywa `POST` z formularza tego samego originu. Skanery poczty (np. Outlook Safe Links) nie spalą linku, a „login CSRF” jest zablokowany sprawdzeniem `Origin`. `HEAD` na API → 405.
- **Limity:** 3 linki na adres i 10 próśb na IP w 15 min (D1 `rate_limits`); po przekroczeniu nadal 200, ale bez maila.
- **Sesja:** nowy losowy identyfikator przy każdym logowaniu (brak session fixation), w bazie tylko hash, 12 h, cookie `__Host-cms_session; Path=/; HttpOnly; Secure; SameSite=Strict`. Wylogowanie i wyłączenie użytkownika usuwają sesje.

## Uprawnienia

- Rola → uprawnienia: `packages/cms-core/src/permissions.ts`. Sprawdzane na każdej trasie.
- **Na poziomie pól:** przy zapisie draftu `requiredPermissions(kind, przed, po, schema)` z rdzenia wylicza, czego wymaga ta konkretna zmiana: pola `advanced` → `MODE_ADVANCED`, `developer` → `MODE_DEVELOPER`, SEO → `SEO_EDIT`, slug/layout → `MODE_DEVELOPER`, tokeny → `DESIGN_EDIT`, komponenty i wzorce → `COMPONENT_EDIT`. Brak choć jednego → 403 z listą brakujących.
- **Publikacja:** `CONTENT_PUBLISH`, a dla tokenów dodatkowo `DESIGN_EDIT`, dla komponentów i wzorców `COMPONENT_EDIT`. Strony nie da się opublikować, jeśli wskazuje nieopublikowany komponent globalny (409 `unpublished_component`), bo wywróciłoby to build publiczny.
- **Użytkownicy:** nie da się usunąć, zdegradować ani wyłączyć ostatniego aktywnego właściciela; rolę `developer` nadaje i odbiera tylko developer; nikt nie zmienia własnej roli.

## CSRF i origin

Zapisy (`POST/PUT/PATCH/DELETE`) wymagają nagłówka `X-CMS-Request: 1` (formularz z obcej strony nie ustawi go bez preflightu CORS, którego API nie obsługuje) i `Origin` równego originowi panelu. Trzecia warstwa: cookie `SameSite=Strict`. Publiczne jest tylko `GET /api/public/site` (CORS `*`, bez cookie) i `GET /media/*`.

## Treść i XSS

- Żadne pole nie przyjmuje HTML. Publiczna strona renderuje tekst interpolacją Vue (escapowanie), bez `v-html`.
- Walidacja rdzenia (`validateFields`): typy, długości, znaki sterujące, nieznane klucze odrzucane, `link.href` tylko `http(s)://`, `mailto:`, `tel:`, `/ścieżka`, `#kotwica` (odrzuca `javascript:`, `data:`, `vbscript:`, `//host`), `image.src` tylko `/…` albo `https://`, `select` i kolory tylko z listy, `setAtPath` blokuje `__proto__`/`constructor`/`prototype`.
- Tokeny: wartości z `; { } < > \` albo `/*` odrzucane, więc nie da się wstrzyknąć CSS.
- Iframe edytora: wiadomości `postMessage` przyjmowane tylko z `location.origin` i z okna rodzica.

## Media

Typ rozpoznawany po **magic bytes** (JPEG, PNG, WebP, AVIF, GIF), nie po rozszerzeniu ani nagłówku. SVG odrzucany (skrypty w SVG). Limit 5 MB. Nazwa pliku czyszczona (małe litery, `a-z0-9-.`, bez ścieżek). Serwowane z `X-Content-Type-Options: nosniff` i `Content-Disposition: inline`. Usunięcie używanego pliku → 409 z listą użyć (wymuszenie tylko świadomie, `MEDIA_DELETE`).

## Nagłówki

Wszystkie odpowiedzi Workera (API i panel): `Content-Security-Policy` (`default-src 'self'`, `frame-ancestors 'self'`, `object-src 'none'`, `form-action 'self'`), `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `Strict-Transport-Security`, `Permissions-Policy`. `script-src` dopuszcza `'unsafe-inline'`, bo SPA Nuxta wstrzykuje konfigurację w inline `<script>`; V2: hashe CSP.

## Sekrety i logi

Sekrety tylko jako sekrety Workera: `RESEND_API_KEY` (wysyłka linków), opcjonalnie `GITHUB_TOKEN` (rebuild po publikacji, fine-grained, uprawnienie *Contents: Read and write* (wymagane przez `repository_dispatch`) tylko do repo `DamianDemrise/dobrolinski.pl`). W repo tylko `.dev.vars.example`. Frazy, które nie mogą trafić na publiczną stronę (cena pilotażowa), są w sekrecie GitHub Actions `CMS_BLOCKED_TEXT` (jedna na linię): `cms-pull` odrzuca wtedy treść z CMS i zostaje snapshot z repo. Logi Workera bez logów wywołań (`invocation_logs = false`), błędy bez stack trace w odpowiedzi.

## Licznik formularzy

`form_events` w D1 CMS: tylko rodzaj formularza i czas, bez adresu i IP (zapis z `offer-worker`, binding `STATS`). `GET /api/stats` i `GET /api/deploy` wymagają sesji (`CONTENT_EDIT`); wypchnięcie strony (`POST /api/rebuild`) wymaga `CONTENT_PUBLISH`. Binding D1 daje `offer-worker` technicznie dostęp do całej bazy CMS; kod Workera wykonuje wyłącznie jeden `INSERT` do `form_events` (test).

## Audit

`audit_log`: logowanie, wylogowanie, publikacja, przywrócenie, odrzucenie zmian, zmiany użytkowników, tworzenie i usuwanie encji, usunięcie mediów.
