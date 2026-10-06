# DEMRISE CMS v1: edytor (dobrolinski.pl)

Instrukcja panelu (ekrany, edytor, zapisywanie i publikacja, komponenty i wzorce, role, połączenie panelu z kodem, ograniczenia v1) jest wspólna dla stron DEMRISE: `vendor/demrise-cms/docs/EDITOR.md`. Tu tylko to, co dotyczy tej strony.

Panel: `https://dobrolinski-cms.demrise.workers.dev/admin/` (Worker `dobrolinski-cms` z `cms-worker/`, ten sam origin co API). Logowanie linkiem e-mail, bez haseł.

## Ta strona w panelu

| Ekran | Na dobrolinski.pl |
|---|---|
| Pulpit | licznik zapytań o ofertę warsztatu i ebook (7 dni / 30 dni / łącznie), zapis z `offer-worker` |
| Strony | nowa strona po publikacji i wypchnięciu jest pod `dobrolinski.pl/<adres>` i w sitemap (chyba że ma noindex); adresy zarezerwowane: `cms/pages.ts` |
| Treści | encje globalne `site` i `workshop`: dane wspólne dla wielu sekcji |

Publikacja zapisuje treść w CMS, ale na dobrolinski.pl trafia dopiero po „Wypchnij na stronę” (commit do `DamianDemrise/dobrolinski.pl`, wdrożenie GitHub Pages).

## Praca lokalna (DEMRISE)

```bash
cp cms-worker/.dev.vars.example cms-worker/.dev.vars   # MAIL_MODE=dry: link logowania w konsoli wranglera
npm run cms:build             # panel do cms-worker/admin-dist
npm run cms:migrate:local     # schemat + treść startowa w lokalnym D1
npm run cms:dev               # http://localhost:8787/admin/
CMS_API_URL=http://localhost:8787 node scripts/cms-pull.mjs && npx nuxt generate   # build z lokalnej treści (nie commituj wyniku)
```

Po zmianach w panelu (`vendor/demrise-cms`) albo schemacie (`cms/`): `npm run cms:build`, a na produkcji `npx wrangler deploy` w `cms-worker/`. Po zmianie treści startowej w repo: `npm run cms:seed` (generuje `migrations/0002_seed.sql`).

## Kopia treści

- Cloudflare D1 trzyma 30 dni historii bazy (Time Travel): `npx wrangler d1 time-travel restore dobrolinski-cms --timestamp=…` w `cms-worker`.
- Repo strony ma zawsze to, co jest na stronie (każde wypchnięcie to commit z historią w git). Szkice, rewizje i użytkownicy są tylko w D1.

## Własna domena panelu (`cms.dobrolinski.pl`)

Worker Cloudflare może dostać własną domenę tylko w strefie DNS prowadzonej w Cloudflare, a DNS dobrolinski.pl jest w lh.pl. Kroki (decyzja i wykonanie: Damian):
1. Cloudflare → Add a domain → `dobrolinski.pl` (plan Free); sprawdzić, że import przeniósł **wszystkie** rekordy z lh.pl (MX Google Workspace, SPF, DKIM i rekordy Resend, `_dmarc`, rekordy GitHub Pages: A/AAAA w korzeniu i `www`).
2. W lh.pl zmienić serwery nazw na te podane przez Cloudflare; poczekać na aktywację strefy.
3. W `cms-worker/wrangler.toml`: `ADMIN_ORIGIN = "https://cms.dobrolinski.pl"` i
   `routes = [{ pattern = "cms.dobrolinski.pl", custom_domain = true }]`, potem `npx wrangler deploy`.
4. Linki logowania i cookie przechodzą na nową domenę (sesje z `workers.dev` wygasają, trzeba zalogować się ponownie).
