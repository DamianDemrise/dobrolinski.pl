# DEMRISE CMS v1: edytor

Panel: `https://dobrolinski-cms.demrise.workers.dev/admin/` (Worker `cms-worker`, ten sam origin co API). Logowanie linkiem e-mail, bez haseł.

## Ekrany

| Ekran | Do czego |
|---|---|
| Pulpit | ostatnie zmiany, strony z nieopublikowanymi zmianami, skróty |
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
5. **Publikuj:** dialog pokazuje różnice względem wersji opublikowanej. Po publikacji Worker wywołuje przebudowę GitHub Pages (jeśli skonfigurowany `GITHUB_TOKEN`), strona aktualizuje się po 1–3 minutach. Bez tokenu panel informuje, że przebudowę trzeba uruchomić ręcznie (Actions → Deploy → Run workflow).
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

## Znane ograniczenia v1

- Media w KV (do 5 MB na plik), R2 niewłączone na koncie.
- `npm audit` zgłasza podatności wyłącznie w narzędziach buildu Nuxta (CLI, devtools, `simple-git`, `node-forge`, `micromatch`), istniejące przed CMS-em. Nie trafiają do kodu strony ani Workera; „poprawka” `npm audit fix --force` cofa Nuxta do 3.7.4, więc świadomie nie zastosowana. Do podbicia przy kolejnej aktualizacji Nuxta.
