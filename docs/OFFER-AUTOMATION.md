# Oferta POZNAJ CZŁOWIEKA: e-mail → PDF

Użytkownik wpisuje e-mail w finale „A jak jest u Was?” na `/poznaj-czlowieka`, dostaje osobisty mail z ofertą (link + załącznik PDF) i może po prostu kliknąć „Odpowiedz”. Damian dostaje krótkie powiadomienie.

Strona zostaje na GitHub Pages. Backend to jeden mały Cloudflare Worker w `offer-worker/`, wdrażany osobno.

## Flow

```
dobrolinski.pl/poznaj-czlowieka (GitHub Pages, statycznie)
      ↓  POST JSON { email, website(honeypot), elapsed, source }
Cloudflare Worker  dobrolinski-oferta  (offer-worker/)
      ↓  origin · content-type · rozmiar · honeypot · czas · walidacja
      ↓  limity w Workers KV: IP, adres, doba · sprawdzenie PDF
Resend API  (klucz tylko w sekretach Workera)
      ↓
┌──────────────────────────────┬──────────────────────────────┐
↓                              ↓
użytkownik                     Damian
oferta + link + PDF            powiadomienie (Reply-To: użytkownik)
Reply-To: damian@dobrolinski.pl
```

## Usługi i koszt

| Usługa | Rola | Koszt przy tej skali |
|---|---|---|
| Cloudflare Workers + KV | endpoint, limity | 0 zł (darmowy plan: 100 tys. requestów i 1000 zapisów KV na dobę) |
| Resend | wysyłka | 0 zł (darmowy plan: 3000 maili na miesiąc, 100 na dobę, logi 30 dni) |
| GitHub Pages | strona i PDF | bez zmian |

Jedna oferta = 2 maile (oferta + powiadomienie), więc `DAILY_LIMIT=40` zostawia zapas w dobowym limicie Resend.
Fallback dostawcy, gdyby Resend nie przeszedł weryfikacji prawnej albo dostarczalności: **Mailjet** (firma i dane w UE). Zmiana dotyczy tylko `offer-worker/src/resend.ts`.

## Pliki

| Plik | Co |
|---|---|
| `shared/offer.ts` | kontrakt i walidacja e-maila, wspólne dla strony i Workera |
| `offer-worker/src/index.ts` | handler: kolejność kontroli, odpowiedzi, logi |
| `offer-worker/src/limits.ts` | limity w KV (klucze to SHA-256, bez adresów i IP) |
| `offer-worker/src/resend.ts` | jedno wywołanie Resend z timeoutem i `Idempotency-Key` |
| `offer-worker/src/templates.ts` | **treść maili** (HTML, tekst, powiadomienie) |
| `offer-worker/src/config.ts` | domyślne wartości i progi limitów |
| `offer-worker/wrangler.toml` | konfiguracja Workera (tylko jawne wartości) |
| `app/components/WorkshopOfferForm.vue`, `app/composables/useOfferForm.ts` | formularz i jego stany |
| `app/content/workshop.ts` (`offer`) | copy formularza |
| `public/oferta/poznaj-czlowieka.pdf` | PDF pod stałym adresem |

## Zmienne

Strona (build): `NUXT_PUBLIC_OFFER_ENDPOINT` albo `runtimeConfig.public.offerEndpoint` w `nuxt.config.ts`. Pusty adres = formularza nie ma na stronie. Adres endpointu jest jawny.

Worker (`wrangler.toml` `[vars]`, lokalnie `offer-worker/.dev.vars` wg `.dev.vars.example`):

| Zmienna | Znaczenie |
|---|---|
| `RESEND_API_KEY` | **sekret**, tylko `npx wrangler secret put RESEND_API_KEY` |
| `MAIL_MODE` | `dry` nic nie wysyła · `test` wszystko na `TEST_RECIPIENT` z `[TEST]` w temacie · `live` do odbiorcy. Brak albo literówka = `dry` |
| `TEST_RECIPIENT` | adres testowy dla trybu `test` |
| `MAIL_FROM` | `Damian Dobroliński <oferta@dobrolinski.pl>` |
| `MAIL_REPLY_TO` | `damian@dobrolinski.pl` |
| `NOTIFICATION_EMAIL` | adres powiadomień |
| `ALLOWED_ORIGINS` | `https://dobrolinski.pl` (lokalnie dopisz `http://localhost:3000`) |
| `PDF_URL` | `https://dobrolinski.pl/oferta/poznaj-czlowieka.pdf` |
| `DAILY_LIMIT` | ofert na dobę, domyślnie 40 |

## Zabezpieczenia

- Endpoint nie jest przekaźnikiem: temat, treść, nadawca, Reply-To i załącznik są stałe w kodzie. Z requestu bierze tylko adres odbiorcy. Pola `subject`, `html`, `from`, `to`, `attachments` są ignorowane (test).
- Walidacja adresu po obu stronach: odrzuca spacje, przecinki, `<>`, CR/LF, więc nie ma jak wstrzyknąć nagłówka. Adres idzie do Resend jako osobne pole JSON.
- Adres odbiorcy nie trafia do HTML-a oferty. W powiadomieniu jest tylko w treści tekstowej.
- CORS: tylko originy z `ALLOWED_ORIGINS`, bez `*`. Origin jest sprawdzany też po stronie serwera (403), a wymagany `Content-Type: application/json` wymusza preflight, co zamyka drogę zwykłym formularzom z obcych stron (CSRF).
- Body do 2 KB, tylko obiekt JSON.
- Honeypot `website` i minimalny czas 1,5 s od wyrenderowania formularza. Bot dostaje fałszywy sukces i nic nie zostaje wysłane.
- Limity: 5 prób na IP na godzinę; ten sam adres raz na 10 minut (powtórka = sukces bez drugiej wysyłki), najwyżej 3 razy na dobę; 40 ofert na dobę łącznie.
- Duplikaty: przycisk zablokowany w trakcie i po sukcesie, KV pamięta adres 10 minut, Resend dostaje `Idempotency-Key`.
- Brak PDF-u albo błąd dostawcy: użytkownik widzi tylko „Nie udało się wysłać oferty” i adres mailowy. Bez kodów, JSON-a i komunikatów dostawcy.
- Bez widocznej CAPTCHA. Jeśli pojawi się spam mimo limitów, kolejny krok to Cloudflare Turnstile w trybie niewidocznym.

## Pomiar

Zdarzenia idą istniejącym kanałem `track_click` (`app/utils/clickTracking.ts`), więc obecny tag GTM wysyła je do GA4 bez zmian w kontenerze. Tylko po zgodzie na statystyki.

| Zdarzenie GA4 | `track_place` |
|---|---|
| `offer_form_view` | `offer` (raz, formularz widoczny w połowie) |
| `offer_form_submit` | `offer` |
| `offer_form_success` | `offer` |
| `offer_form_error` | `offer-validation`, `offer-network`, `offer-server`, `offer-limit` |

Nigdy nie wysyłamy adresu e-mail ani UTM jako parametru zdarzenia. Śledzenie otwarć i kliknięć w Resend ma być **wyłączone** (Domains → dobrolinski.pl → Configuration).

## Prywatność i logi

- Adres służy wyłącznie do wysłania oferty. Bez newslettera, bez zgody marketingowej, bez późniejszych kampanii.
- Własnej bazy leadów nie ma. Ślad zostaje w trzech miejscach: skrzynka Damiana (powiadomienie), logi Resend (adres odbiorcy, 30 dni) i KV (tylko skróty SHA-256, wygasają po dobie).
- Logi Workera: czas, status, typ błędu. Bez adresu i bez treści maila.
- **Do potwierdzenia prawnego:** obowiązek informacyjny RODO przy formularzu (administrator, cel, podstawa, odbiorcy: Cloudflare i Resend, transfer poza EOG, okres, prawa). Na stronie nie ma dziś polityki prywatności.

## DNS (bez zmian do zgody Damiana; DNS jest w lh.pl)

Stan 05.10.2026: MX Google Workspace; **dwa rekordy SPF w korzeniu** (`v=spf1 include:_spf.lh.pl -all` oraz `v=spf1 include:_spf.google.com include:_spf.lh.pl -all`), co według RFC 7208 daje błąd SPF dla całej domeny; brak DMARC.

1. Usunąć `v=spf1 include:_spf.lh.pl -all` i zostawić jeden rekord: `v=spf1 include:_spf.google.com include:_spf.lh.pl -all`.
2. Dodać `_dmarc` TXT: `v=DMARC1; p=none; rua=mailto:damian@dobrolinski.pl` (po kilku tygodniach czystych raportów: `p=quarantine`).
3. Rekordy Resend (DKIM `resend._domainkey`, MX i SPF na subdomenie zwrotnej) **skopiować z panelu Resend** po dodaniu domeny. Nie zgadujemy ich wartości. Nie dotykają rekordu SPF w korzeniu.

## Wdrożenie endpointu

```bash
cd offer-worker
npx wrangler login
npx wrangler kv namespace create OFFER_KV        # id wpisać do wrangler.toml
npx wrangler secret put RESEND_API_KEY
npx wrangler deploy                              # MAIL_MODE=test z wrangler.toml
```

Adres z `wrangler deploy` (`https://dobrolinski-oferta.<konto>.workers.dev`) wpisać w `nuxt.config.ts` jako `offerEndpoint`. Na `live` przełączyć dopiero po teście end-to-end w trybie `test`.

## Testowanie

- `npm run check` (lint, typecheck strony i Workera, testy). Testy Workera: `tests/offer-worker.test.ts`.
- Lokalnie bez wysyłki: `npm run offer:dev` (endpoint `dry` na :8787; `DEV_FAIL=slow|5xx|network` symuluje awarie), potem `NUXT_PUBLIC_OFFER_ENDPOINT=http://localhost:8787 npm run generate` i podgląd buildu.
- Podgląd maila bez wysyłki: `npm run offer:preview` → `design/email-offer-preview.html` i `.txt`.
- Na produkcji: tryb `test` → wysyłka z formularza → mail w skrzynce testowej (Gmail web i mobile, Apple Mail, Outlook) → `live`.

## Aktualizacja PDF

Podmień `public/oferta/poznaj-czlowieka.pdf` (ta sama nazwa i ścieżka), PR, merge. Adres się nie zmienia. GitHub Pages trzyma pliki w cache ok. 10 minut, więc nowa wersja dociera w tym czasie, bez query stringów. Przed commitem sprawdź, że PDF nie zawiera ceny pilotażowej (repo jest publiczne). Pod `/poznaj-czlowieka/` nie wolno tworzyć katalogu: przesłoniłby stronę warsztatu na GitHub Pages (pilnuje test).

## Zmiana treści maila

`offer-worker/src/templates.ts` → `npm run offer:preview` → akceptacja → `npx wrangler deploy`. Zmiana copy formularza: `app/content/workshop.ts` (`offer`).

## Troubleshooting

| Objaw | Sprawdź |
|---|---|
| Formularza nie ma | `offerEndpoint` pusty w buildzie |
| Zawsze „Nie udało się” | `npx wrangler tail`: `pdf_missing`, `provider_4xx:401` (klucz), `provider_4xx:403` (domena niezweryfikowana), `origin` |
| Mail w spamie | SPF (jeden rekord), DKIM zweryfikowany w Resend, DMARC |
| Nic nie przychodzi, a jest sukces | `MAIL_MODE` (`dry`?) albo `test` (idzie na `TEST_RECIPIENT`) |
| 429 u prawdziwych osób | limity w `offer-worker/src/config.ts` (`LIMITS`, `DAILY_LIMIT`) |
