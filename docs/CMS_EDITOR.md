# DEMRISE CMS v1: edytor

Panel: `https://dobrolinski-cms.demrise.workers.dev/admin/` (Worker `cms-worker`, ten sam origin co API). Logowanie linkiem e-mail, bez haseł.

## Ekrany

| Ekran | Do czego |
|---|---|
| Pulpit | skróty, stan strony publicznej (co opublikowane, a jeszcze nie wypchnięte) z przyciskiem „Wypchnij na stronę”, licznik zapytań o ofertę i ebook (7 dni / 30 dni / łącznie) |
| Strony | lista stron ze statusem (opublikowana / zmieniona / szkic), wejście do edytora |
| Treści | encje globalne (`site`, `workshop`): dane wspólne dla wielu sekcji |
| Komponenty | komponenty globalne (jedna treść w wielu miejscach) i wzorce (kopiowane układy bloków) |
| Design | tokeny: kolory, typografia, odstępy, szerokości, promienie (tylko z uprawnieniem `DESIGN_EDIT`) |
| Media | biblioteka obrazów: upload, opis alt, podmiana pliku, usuwanie z listą użyć |
| SEO | przegląd tytułów i opisów wszystkich stron z licznikami długości |
| Użytkownicy | zaproszenia, role, wyłączanie kont (`USERS_MANAGE`) |
| Ustawienia | stan integracji (wysyłka maili, przebudowa po publikacji) |

## Edytor strony

- **Canvas:** prawdziwa strona renderowana tymi samymi komponentami co produkcja (iframe `/admin/frame`), więc to, co widać, jest 1:1 z publiczną stroną. Klik w sekcję zaznacza blok, klik w tekst oznaczony jako `inline` pozwala pisać bezpośrednio na stronie (czysty tekst, bez formatowania).
- **Inspector** (prawa kolumna), zakładki: *Treść*, *Wygląd* (warianty, kolory z tokenów), *Responsywność* (widoczność per urządzenie), *SEO* strony. Pola zaawansowane i deweloperskie są widoczne, ale zablokowane w trybie SAFE.
- **Navigator** (lewa kolumna): drzewo bloków, przesuwanie (przyciski albo strzałki), ukrywanie, duplikowanie, usuwanie, wstawianie wzorca. Bloki o stałej pozycji i nieusuwalne mają zablokowane akcje (sprawdza też backend).
- **Urządzenia:** Desktop / Tablet / Mobile (1440 / 834 / 390 px) w górnym pasku.
- **Tryby:** SAFE (treść), ADVANCED (warianty, układ, SEO), DEVELOPER (slug, layout, pola techniczne). Tryb wynika z roli, nie da się go przełączyć ponad uprawnienia.

## Zapisywanie i publikacja

1. **Autosave:** każda zmiana trafia do wersji roboczej po 800 ms bezczynności. Status w górnym pasku: *Zapisano / Zapisywanie / Offline (ponawiam) / Błąd / Konflikt*. Kopia niezapisanych zmian w `sessionStorage` tej karty pozwala odzyskać pracę po awarii przeglądarki.
2. **Konflikt:** gdy ktoś inny zapisał tę samą stronę, dialog daje wybór *Wczytaj aktualną wersję* albo *Nadpisz moją wersją*.
3. **Cofnij / Ponów:** `Cmd/Ctrl+Z`, `Cmd/Ctrl+Shift+Z` (albo `Ctrl+Y`), do 100 kroków; pisanie w jednym polu łączy się w jeden krok.
4. **Podgląd:** otwiera wersję roboczą w nowej karcie z banerem „Podgląd wersji roboczej — niepublikowane”. Publiczna strona się nie zmienia.
5. **Publikuj:** dialog pokazuje różnice względem wersji opublikowanej. Publikacja zapisuje treść w CMS, **ale nie zmienia strony**: na dobrolinski.pl trafia po wypchnięciu. Pulpit pokazuje listę publikacji, których jeszcze nie ma na stronie, i przycisk **„Wypchnij na stronę”**: z `GITHUB_TOKEN` w Workerze uruchamia build od razu, bez tokenu otwiera GitHub Actions („Run workflow”). Strona odświeża się po 1–2 minutach. Automatyczne wypychanie po każdej publikacji można włączyć zmienną `REBUILD_ON_PUBLISH = "1"` w `cms-worker/wrangler.toml`.
6. **Odrzuć zmiany:** przywraca wersję roboczą do opublikowanej.
7. **Rewizje:** szuflada z historią (publikacje, punkty kontrolne, przywrócenia), podgląd różnic, *Przywróć* zapisuje starą wersję jako wersję roboczą (do opublikowania osobno).

## Komponenty globalne a wzorce

- **Komponent globalny** (np. stopka, link powrotu, linki kontaktowe): jedna treść, wiele miejsc. Zmiana i publikacja komponentu zmienia go na wszystkich stronach. Instancja może nadpisać tylko pola wystawione przez komponent. Strony nie da się opublikować, jeśli wskazuje nieopublikowany komponent.
- **Wzorzec:** zapisany układ bloków. Wstawienie kopiuje bloki na stronę, dalej są niezależne.

## Role

| Rola | Może |
|---|---|
| Edytor treści | edytować treść w trybie SAFE, wgrywać media; nie publikuje |
| Redaktor | jak wyżej + publikacja, SEO, usuwanie mediów, tryb ADVANCED |
| Właściciel | wszystko poza trybem DEVELOPER: design, komponenty, użytkownicy, ustawienia |
| DEMRISE Developer | wszystko, w tym slug, layout i pola techniczne |

## Praca lokalna (DEMRISE)

```bash
cp cms-worker/.dev.vars.example cms-worker/.dev.vars   # MAIL_MODE=dry: link logowania w konsoli wranglera
npm run cms:build             # panel do cms-worker/admin-dist
npm run cms:migrate:local     # schemat + treść startowa w lokalnym D1
npm run cms:dev               # http://localhost:8787/admin/
CMS_API_URL=http://localhost:8787 node scripts/cms-pull.mjs && npx nuxt generate   # build publiczny z lokalnej treści
```

Po zmianach w panelu albo schemacie (`cms/`): `npm run cms:build`, a na produkcji `npx wrangler deploy` w `cms-worker/`. Po zmianie treści startowej w repo: `npm run cms:seed` (generuje `migrations/0002_seed.sql`).

## Kopia treści

- Cloudflare D1 trzyma 30 dni historii bazy (Time Travel): `npx wrangler d1 time-travel restore dobrolinski-cms --timestamp=…` w `cms-worker`.
- Co poniedziałek 3:30 UTC workflow **CMS backup** (`.github/workflows/cms-backup.yml`) zapisuje opublikowaną treść, tokeny i media w repo (commit tylko przy zmianie treści). Ręcznie: Actions → CMS backup → Run workflow. Kopia nie wypycha strony.

## Własna domena panelu (`cms.dobrolinski.pl`)

Worker Cloudflare może dostać własną domenę tylko w strefie DNS prowadzonej w Cloudflare, a DNS dobrolinski.pl jest w lh.pl. Kroki (decyzja i wykonanie: Damian):
1. Cloudflare → Add a domain → `dobrolinski.pl` (plan Free); sprawdzić, że import przeniósł **wszystkie** rekordy z lh.pl (MX Google Workspace, SPF, DKIM i rekordy Resend, `_dmarc`, rekordy GitHub Pages: A/AAAA w korzeniu i `www`).
2. W lh.pl zmienić serwery nazw na te podane przez Cloudflare; poczekać na aktywację strefy.
3. W `cms-worker/wrangler.toml`: `ADMIN_ORIGIN = "https://cms.dobrolinski.pl"` i
   `routes = [{ pattern = "cms.dobrolinski.pl", custom_domain = true }]`, potem `npx wrangler deploy`.
4. Linki logowania i cookie przechodzą na nową domenę (sesje z `workers.dev` wygasają, trzeba zalogować się ponownie).

## Znane ograniczenia v1

- Media w KV (do 5 MB na plik), R2 niewłączone na koncie.
- `npm audit` zgłasza podatności wyłącznie w narzędziach buildu Nuxta (CLI, devtools, `simple-git`, `node-forge`, `micromatch`), istniejące przed CMS-em. Nie trafiają do kodu strony ani Workera; „poprawka” `npm audit fix --force` cofa Nuxta do 3.7.4, więc świadomie nie zastosowana. Do podbicia przy kolejnej aktualizacji Nuxta.
