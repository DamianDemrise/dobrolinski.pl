# DEMRISE CMS v1: bezpieczeństwo (dobrolinski.pl)

Model bezpieczeństwa CMS (logowanie, sesja, uprawnienia, CSRF, XSS, media, nagłówki, synchronizacja z repo, audit) jest wspólny dla stron DEMRISE: `vendor/demrise-cms/docs/SECURITY.md`. Testy uprawnień: `vendor/demrise-cms/worker/test/*.test.ts`, testy ataków na schemat i treść tej strony: `tests/cms-xss.test.ts`.

Tu tylko to, co dotyczy tej strony.

## Sekrety

Sekrety Workera `dobrolinski-cms`: `RESEND_API_KEY` (wysyłka linków logowania), `GITHUB_TOKEN` (wypychanie: commit do repo; fine-grained, *Contents: Read and write*, tylko repo `DamianDemrise/dobrolinski.pl`). W repo tylko `cms-worker/.dev.vars.example`.

Sekret GitHub Actions `DEMRISE_CMS_DEPLOY_KEY`: klucz wdrożeniowy (tylko odczyt) prywatnego repo `demrise-pl/demrise-cms`; workflow Deploy pobiera nim submoduł `vendor/demrise-cms`.

## Licznik formularzy

`form_events` w D1 `dobrolinski-cms` zapisuje `offer-worker` (binding `STATS`): rodzaj formularza (`offer`, `ebook`) i czas, bez adresu i IP. Binding D1 daje `offer-worker` technicznie dostęp do całej bazy CMS; kod Workera wykonuje wyłącznie jeden `INSERT` do `form_events` (`tests/offer-worker.test.ts`).
