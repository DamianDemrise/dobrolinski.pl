# Polityka prywatności dobrolinski.pl: projekt i audyt zgodności

Stan: 05.10.2026, projekt do akceptacji (nieopublikowany). Final pre-production check: sekcja A. Treść na stronie: `app/content/privacy.ts` → `/polityka-prywatnosci`.
Baza: https://demrise.pl/polityka-prywatnosci (obowiązuje od 15.01.2026).

## A. Final pre-production check (05.10.2026, ok. 20:00)

Status: **OK** · **DO DECYZJI** · **NIEZGODNE**

| Element | Polityka deklaruje | Produkcja / dostawca faktycznie | Źródło potwierdzenia | Status |
|---|---|---|---|---|
| Logi formularza (Workers Logs) | czas i wynik, bez e-maila i IP, do 3 dni (p. 8) | Wersja 75822066 (wdrożona 19:53) zapisuje tylko nasz wpis: `ts`, `status`, `detail` + metoda, URL, identyfikatory techniczne. Brak IP, nagłówków, geolokalizacji, e-maila. Starsze wpisy (wersja 57a704c4, tylko ruch testowy) zawierają nagłówki i geolokalizację; wygasają do 08.10.2026 | Cloudflare → dobrolinski-oferta → Observability, wpis 19:54:16 vs 19:53:09; docs Workers Logs: retencja Free 3 dni | OK |
| Zabezpieczenia formularza (KV) | skrót IP i e-maila, najpóźniej doba (p. 4.5, 8) | SHA-256; IP 1 h, e-mail 24 h | `offer-worker/src/limits.ts` | OK |
| Formularz | tylko e-mail; jedna wiadomość; bez newslettera | endpoint przyjmuje e-mail, honeypot, czas, stronę i UTM; wysyła 1 ofertę + powiadomienie; brak automatycznego follow-upu; ponowna wysyłka tylko na nową prośbę użytkownika (najwyżej raz na 10 min, 3/dobę) | kod + test produkcyjny 19:54 | OK |
| „Nie wysyła kolejnych wiadomości, chyba że Użytkownik odpowie” (p. 4.3) | brak dalszych wiadomości | system: prawda. Ręczny kontakt Damiana po pobraniu oferty (np. „czy dotarło?”) byłby z tym sprzeczny | kod; zamiar Damiana nieustalony | DO DECYZJI |
| Podstawa formularza: art. 6.1.b | b dla przesłania oferty | 6.1.b wymaga, by osoba, której dane dotyczą, była (przyszłą) stroną umowy. Warsztat kupuje firma: dla pracownika spółki stroną jest spółka, więc właściwa jest raczej 6.1.f. Dla przedsiębiorcy JDG działającego we własnym imieniu 6.1.b pasuje | RODO art. 6 ust. 1 lit. b; Wytyczne EROD 2/2019 (umowa z osobą, której dane dotyczą). Ocena wymaga prawnika | DO DECYZJI |
| Provider e-mail | Resend (Plus Five Five, Inc.), Irlandia, rejestr 30 dni | domena zweryfikowana, region eu-west-1, plan Free (30 dni), tracking nieskonfigurowany | panel Resend; resend.com/pricing | OK |
| Resend: DPA | warunki przetwarzania dostawcy | DPA jest częścią Terms of Service („entire agreement”), zawiera SCC i deklarację DPF | resend.com/legal/terms-of-service, /legal/dpa | OK |
| Resend: DPF | DPF + SCC | „Resend”: EU-U.S. DPF i UK Extension **Active – Re-certification under Review** | dataprivacyframework.gov/list | OK |
| Cloudflare: DPA | warunki przetwarzania dostawcy | DPA v6.4 (03.04.2026) „forms part of the Main Agreement”, w tym Self-Serve; SCC + DPF | cloudflare.com/cloudflare-customer-dpa | OK |
| Cloudflare: DPF | DPF + SCC | Cloudflare, Inc.: EU-U.S., Swiss, UK **Active – Re-certification under Review** | dataprivacyframework.gov/list | OK |
| GitHub Pages: podstawa | „umowy powierzenia lub warunki przetwarzania danych” (p. 5.1) | konto DamianDemrise = **GitHub Free**. GitHub DPA „forms part of the GitHub Customer Agreement”, nie obejmuje kont Free i nie wspomina Pages. Rola GitHub wobec logów IP odwiedzających (procesor czy odrębny administrator) nieustalona w dokumentach | github.com/settings/billing; github.com/customer-terms/github-data-protection-agreement (Version October 2025); docs.github.com „What is GitHub Pages” | DO DECYZJI (prawna) |
| GitHub: DPF | DPF + SCC | GitHub: EU-U.S., Swiss, UK **Active** | dataprivacyframework.gov/list | OK |
| GitHub: logi IP | IP logowane dla bezpieczeństwa (p. 9.1) | „visitor's IP address is logged and stored for security purposes”; okres nieopisany | docs.github.com | OK (okres „na zasadach GitHub”) |
| GA4 | tylko po zgodzie; `_ga`, `_ga_*`; 2 mies. / 14 mies.; Sygnały wyłączone | przed zgodą 0 zasobów zewnętrznych i 0 cookies (produkcja); retencja 2 mies. zdarzenia, 14 mies. użytkownik; Google Signals i dane przekazywane przez użytkowników wyłączone | produkcja (przeglądarka), panel GA4 | OK |
| GA4: DPA | warunki przetwarzania dostawcy | „Zasady przetwarzania danych … zaakceptowane 4 października 2026” | GA4 → Szczegóły konta | OK |
| Google: DPF | DPF + SCC | Google LLC: EU-U.S., Swiss, UK **Active** | dataprivacyframework.gov/list | OK |
| Google Workspace: DPA | warunki przetwarzania dostawcy | nie sprawdzone: panel admin.google.com wymaga ponownego logowania hasłem (nie wpisuję haseł). Nie wiem też, czy dobrolinski.pl to osobny Workspace, czy domena w Workspace DEMRISE | brak | DO DECYZJI (sprawdzenie przez Damiana) |
| Google Workspace: retencja | e-mail z formularza i korespondencja do 12 miesięcy (p. 8) | brak znanego procesu ani ustawienia (reguła Vault, skrypt, ręczne usuwanie). Gmail domyślnie nie usuwa wiadomości | brak dowodu ustawienia | **NIEZGODNE** |
| GTM | po zgodzie | kontener: tylko Google tag + zdarzenie GA4 | publiczny gtm.js | OK |
| Cookies / localStorage | bez zgody tylko decyzja w localStorage | potwierdzone na produkcji | przeglądarka | OK |
| CMP | własny baner Zgoda / Odrzuć + „Cookies” | `ConsentBanner.vue`; CookieYes nie występuje | kod | OK |
| Meta Pixel | nie używany | brak w kodzie i GTM | kod, gtm.js | OK |
| PDF delivery | załącznik + link | test 19:54: oferta dostarczona na damian@demrise.pl | panel Resend (Delivered) | OK (PDF jest jeszcze testowy) |

## B. Status po decyzjach Damiana (05.10.2026, ok. 20:15)

Zmiany w szkicu (lokalnie, niepublikowane): kontakt Administratora → damian@demrise.pl; p. 3: wariant b/f (do prawnika); p. 5.1: usunięte ogólne „na podstawie umów powierzenia”, przy Cloudflare i Resend wprost „na podstawie umowy powierzenia”, przy GitHub tylko „na zasadach określonych w warunkach korzystania z usługi i polityce prywatności GitHub” (bez sugestii DPA).

**Cloudflare `invocation_logs = false`: ROZWIĄZANE.** Aktywna wersja 75822066 (100% ruchu, wdrożona 05.10.2026 19:53 CEST) zapisuje wyłącznie czas, status, typ błędu, metodę i URL. Wpisy starej wersji (z nagłówkami i geolokalizacją, tylko ruch testowy, ostatni 05.10.2026 19:53:09 CEST) wygasną automatycznie najpóźniej **08.10.2026 ok. 19:53 CEST** (retencja Workers Logs Free: 3 dni).

**Kontakt damian@demrise.pl:** domena demrise.pl ma MX Google Workspace, skrzynka odebrała mail testowy 05.10.2026 (Resend: Delivered), konto Google damian@demrise.pl jest aktywne. To, że skrzynka jest regularnie czytana, potwierdza Damian.

Do analogicznej zmiany w polityce DEMRISE (demrise.pl/polityka-prywatnosci, NIE zmieniane):
1. pkt 1.2: „…prosimy o kontakt pod adresem e-mail: michal@demrise.pl”,
2. pkt 9.1 (po liście praw): „Żądania prosimy kierować na michal@demrise.pl lub pisemnie na adres siedziby”.
(biuro@demrise.pl występuje tylko w stopce strony, nie w treści polityki.)

**Retencja Google Workspace, propozycja do akceptacji (jeszcze NIEwprowadzona) w miejsce dwóch pierwszych punktów listy w p. 8:**

> wiadomości e-mail, w tym powiadomienie o prośbie o ofertę i dalsza korespondencja, przechowywane w skrzynce pocztowej Administratora: przez czas prowadzenia korespondencji i ewentualnej współpracy, a następnie do czasu ich usunięcia przy porządkowaniu skrzynki, nie dłużej niż do upływu terminów przedawnienia roszczeń; możesz w każdej chwili zażądać wcześniejszego usunięcia,
> adres e-mail w rejestrze systemu wysyłki: do 30 dni.

Bez deklaracji automatycznego kasowania i bez „bezterminowo”. Górną granicą są terminy przedawnienia (art. 118 KC), a prawo do usunięcia jest wskazane wprost.

## C. Różnice względem polityki DEMRISE

Usunięte: dane formularza B2B (imię, firma, telefon), Facebook Pixel i cookies reklamowe, CookieYes, „operatorzy płatności, firmy kurierskie”, „procesy regularnie audytowane” (nie da się potwierdzić), „analizy wewnętrzne i planowanie rozwoju usług” jako osobny cel, podstawa „lit. f” dla GA4 (tu wyłącznie zgoda).

Dodane: zdanie o projekcie Damiana w ramach Spółki; kontakt projektowy damian@dobrolinski.pl obok oficjalnego; sekcja o formularzu oferty (brak newslettera, powiadomienie, antyspam); nazwani odbiorcy (GitHub, Cloudflare, Resend, Google); przekazywanie poza EOG z mechanizmami; retencja dla formularza, rejestru wysyłek, zabezpieczeń i logów; logi GitHub Pages i Cloudflare; opis faktycznego banera i localStorage; wyraźne zdanie o braku Meta Pixel; zdanie, że automatyczna wysyłka nie jest profilowaniem.

Zachowane: dane administratora, 2.1 RODO, struktura sekcji, prawa a–h, retencja 12 miesięcy dla korespondencji, sekcja zmian.

## D. Tekst pod formularzem

Podając e-mail, prosisz mnie o przesłanie oferty warsztatu „Poznaj Człowieka”. Adres wykorzystam w tym celu. Nie zapisuję Cię do newslettera. Szczegóły znajdziesz w Polityce prywatności. („Polityce prywatności” = link do /polityka-prywatnosci; zastępuje wcześniejsze „Bez newslettera. Dostaniesz tylko ofertę.”)

## F. Notatka dla prawnika: GitHub Pages

- **Co i kiedy:** Serwis to statyczne pliki na GitHub Pages (domena dobrolinski.pl, rekordy A na 185.199.108–111.153). Każde wejście na stronę to żądanie HTTP do serwerów GitHub. GitHub dostaje adres IP, znacznik czasu, żądany adres i nagłówki przeglądarki (np. User-Agent).
- **Cel po stronie GitHub:** według dokumentacji „the visitor's IP address is logged and stored for security purposes” (docs.github.com, „What is GitHub Pages”). Okres przechowywania nie jest opisany.
- **Nasze konto:** osobiste konto GitHub DamianDemrise, plan GitHub Free, repozytorium publiczne. Brak umowy z GitHub poza GitHub Terms of Service.
- **Dokumenty:** GitHub Terms of Service; GitHub General Privacy Statement (ogólnie: „Service Usage Information” obejmuje IP, nie ma części o odwiedzających Pages); GitHub Data Protection Agreement, Version October 2025: „forms part of the GitHub Customer Agreement”, nie wspomina Pages, a konto Free nie ma Customer Agreement.
- **DPF:** GitHub, Inc. na dataprivacyframework.gov: EU-U.S. DPF, Swiss-U.S. DPF i UK Extension **Active** (sprawdzone 05.10.2026).
- **Nie udało się ustalić:** czy wobec danych odwiedzających Pages GitHub działa jako podmiot przetwarzający Demrise sp. z o.o. (wtedy brak umowy z art. 28 RODO), czy jako odrębny administrator przetwarzający logi we własnym celu bezpieczeństwa (wtedy wystarczy informacja w polityce). Żaden z dokumentów nie rozstrzyga tego dla kont Free.
- **Pytanie:** czy przy tym stanie wystarczy obecne brzmienie p. 5.1 i 9.1, czy potrzebna jest zmiana hostingu lub planu z DPA (np. GitHub Enterprise).

## E. Pełna treść polityki (szkic po zmianach z 05.10.2026, 20:15)

### Polityka prywatności

dobrolinski.pl

Data obowiązywania: 5 października 2026 r.

#### 1. Administrator danych osobowych

1.1. Administratorem danych osobowych Użytkowników serwisu dobrolinski.pl oraz www.dobrolinski.pl (dalej: „Serwis”) jest Demrise sp. z o.o. z siedzibą przy ul. Floriańskiej 55, 08-110 Siedlce, wpisana do rejestru przedsiębiorców KRS pod numerem 0001157533, NIP 821-269-69-09, REGON 540982054, o kapitale zakładowym w wysokości 5 000,00 zł wpłaconym w całości (dalej: „Administrator” lub „Spółka”).

1.2. Serwis jest projektem Damiana Dobrolińskiego realizowanym w ramach działalności Demrise sp. z o.o.

1.3. We wszelkich sprawach związanych z przetwarzaniem danych osobowych prosimy o kontakt pod adresem e-mail: damian@demrise.pl. W sprawach dotyczących samego projektu możesz pisać także na damian@dobrolinski.pl.

#### 2. Przetwarzanie danych osobowych: informacje podstawowe

2.1. Wszelkie dane osobowe są gromadzone, przechowywane i przetwarzane zgodnie z Rozporządzeniem Parlamentu Europejskiego i Rady (UE) 2016/679 z dnia 27 kwietnia 2016 r. w sprawie ochrony osób fizycznych w związku z przetwarzaniem danych osobowych i w sprawie swobodnego przepływu takich danych oraz uchylenia dyrektywy 95/46/WE („RODO”).

2.2. Serwis nie wymaga rejestracji ani logowania. Użytkownik przekazuje dane osobowe tylko wtedy, gdy sam z tego skorzysta:

- w formularzu „Wyślij mi ofertę” na stronie /poznaj-czlowieka podaje wyłącznie adres e-mail,
- pisząc wiadomość e-mail podaje adres e-mail, treść wiadomości i dane, które sam w niej umieści.

2.3. Dane osobowe są chronione przed dostępem osób nieuprawnionych. Administrator nie przetwarza w Serwisie szczególnych kategorii danych.

2.4. Administrator nie podejmuje wobec Użytkowników decyzji opartych wyłącznie na zautomatyzowanym przetwarzaniu, które wywoływałyby skutki prawne lub w podobny sposób istotnie na nich wpływały, i nie profiluje Użytkowników. Automatyczne wysłanie oferty po wypełnieniu formularza jest wyłącznie realizacją prośby Użytkownika.

#### 3. Cele i podstawy prawne przetwarzania danych

- Przesłanie zamówionej oferty warsztatu „Poznaj Człowieka”: art. 6 ust. 1 lit. b RODO (działania podejmowane na żądanie osoby, której dane dotyczą, przed zawarciem umowy), gdy prosisz o ofertę we własnym imieniu; gdy działasz w imieniu firmy lub organizacji, która może zawrzeć umowę, art. 6 ust. 1 lit. f RODO (prawnie uzasadniony interes Administratora polegający na odpowiedzi na prośbę o ofertę i kontakcie z przedstawicielem potencjalnego kontrahenta).
- Obsługa korespondencji, w tym odpowiedzi na ofertę: art. 6 ust. 1 lit. b RODO, gdy korespondencja dotyczy zawarcia lub wykonania umowy, a w pozostałym zakresie art. 6 ust. 1 lit. f RODO (prawnie uzasadniony interes Administratora polegający na prowadzeniu korespondencji).
- Zapewnienie bezpieczeństwa Serwisu, w tym ochrona formularza przed nadużyciami i automatycznymi zgłoszeniami: art. 6 ust. 1 lit. f RODO.
- Statystyka odwiedzin (Google Analytics 4): art. 6 ust. 1 lit. a RODO (zgoda wyrażona w banerze Serwisu).
- Zapamiętanie decyzji Użytkownika dotyczącej statystyk: art. 6 ust. 1 lit. f RODO (wykazanie i respektowanie wyboru Użytkownika).
- Ustalenie, dochodzenie lub obrona roszczeń: art. 6 ust. 1 lit. f RODO.

#### 4. Formularz „Wyślij mi ofertę”

4.1. Podając adres e-mail w formularzu, Użytkownik prosi o przesłanie oferty warsztatu „Poznaj Człowieka”. Na ten adres wysyłana jest automatycznie jedna wiadomość z ofertą w formacie PDF w załączniku oraz z linkiem do tej samej oferty w Serwisie.

4.2. Podanie adresu e-mail jest dobrowolne, ale bez niego nie możemy wysłać oferty.

4.3. Podanie adresu e-mail nie zapisuje Użytkownika do newslettera, nie jest zgodą na otrzymywanie informacji marketingowych i nie powoduje dopisania adresu do żadnej listy marketingowej. Administrator nie wysyła na ten adres kolejnych wiadomości, chyba że Użytkownik sam odpowie na ofertę albo napisze.

4.4. Po wysłaniu oferty Damian Dobroliński otrzymuje wiadomość z informacją o prośbie: adres e-mail Użytkownika, datę oraz stronę i parametry kampanii (UTM), z których nastąpiło wejście, jeżeli były w adresie strony. Serwis nie prowadzi osobnej bazy adresów.

4.5. Aby chronić formularz przed nadużyciami, przy wysłaniu formularza przetwarzane są również dane techniczne, w tym adres IP. Służą one wyłącznie do ograniczania liczby zgłoszeń i blokowania automatycznych prób, są przechowywane w postaci skrótu kryptograficznego i usuwane automatycznie najpóźniej po upływie doby.

#### 5. Odbiorcy danych osobowych

5.1. Dane osobowe mogą być przekazywane podmiotom świadczącym usługi na rzecz Spółki, wyłącznie w zakresie niezbędnym do realizacji celu przetwarzania. W Serwisie są to:

- GitHub, Inc. (USA): hosting Serwisu w usłudze GitHub Pages; dane techniczne połączeń są przetwarzane na zasadach określonych w warunkach korzystania z usługi i polityce prywatności GitHub,
- Cloudflare, Inc. (USA): infrastruktura obsługująca formularz „Wyślij mi ofertę”, na podstawie umowy powierzenia przetwarzania danych,
- Plus Five Five, Inc., działająca jako Resend (USA): wysyłka wiadomości z ofertą i powiadomienia z serwerów zlokalizowanych w Irlandii, na podstawie umowy powierzenia przetwarzania danych,
- Google (Google Ireland Limited oraz Google LLC): obsługa poczty e-mail w domenie dobrolinski.pl (Google Workspace) oraz, po wyrażeniu zgody, statystyka Google Analytics 4.

5.2. Dane mogą zostać udostępnione organom publicznym wyłącznie wtedy, gdy obowiązek taki wynika z przepisów prawa.

#### 6. Przekazywanie danych poza Europejski Obszar Gospodarczy

6.1. Dostawcy wymienieni w punkcie 5 mają siedzibę lub podmioty powiązane w Stanach Zjednoczonych, dlatego dane mogą być przekazywane poza Europejski Obszar Gospodarczy.

6.2. Przekazanie odbywa się na podstawie decyzji Komisji Europejskiej stwierdzającej odpowiedni stopień ochrony w ramach EU-US Data Privacy Framework, w odniesieniu do dostawców, którzy przystąpili do tego programu, a uzupełniająco na podstawie standardowych klauzul umownych przyjętych przez Komisję Europejską.

#### 7. Ochrona danych

7.1. Serwis działa wyłącznie przez szyfrowane połączenie HTTPS (TLS). Klucze dostępowe do usług zewnętrznych są przechowywane wyłącznie po stronie serwera i nie trafiają do przeglądarki Użytkownika. Dostęp do danych mają wyłącznie osoby upoważnione przez Administratora.

7.2. Formularz przyjmuje tylko adres e-mail i wysyła wyłącznie ustaloną wiadomość z ofertą. Zgłoszenia są weryfikowane, a ich liczba jest ograniczana.

#### 8. Okres przechowywania danych

- adres e-mail z formularza: w systemie wysyłki do 30 dni (rejestr wysłanych wiadomości), a w skrzynce pocztowej Administratora do 12 miesięcy od ostatniego kontaktu lub do upływu terminów przedawnienia roszczeń,
- korespondencja e-mail: do 12 miesięcy od zakończenia korespondencji, a jeżeli dojdzie do zawarcia umowy, przez okres wymagany przepisami prawa lub do upływu terminów przedawnienia roszczeń,
- dane techniczne służące ochronie formularza: najpóźniej do upływu doby,
- logi techniczne formularza (czas i wynik zgłoszenia, bez adresu e-mail i adresu IP): do 3 dni,
- dane statystyczne Google Analytics 4: dane o zdarzeniach do 2 miesięcy, dane na poziomie użytkownika do 14 miesięcy od ostatniej aktywności, następnie wyłącznie w formie zagregowanej,
- pliki cookies i dane w pamięci przeglądarki: zgodnie z czasem ich ważności (punkt 11) lub do usunięcia przez Użytkownika.

#### 9. Logi systemowe

9.1. Przy każdym wejściu do Serwisu dostawca hostingu (GitHub) zapisuje adres IP odwiedzającego w celach bezpieczeństwa, na zasadach opisanych w dokumentacji GitHub. Logi mogą zawierać również znacznik czasu i informacje techniczne o przeglądarce.

9.2. Przy wysłaniu formularza infrastruktura Cloudflare przetwarza dane techniczne połączenia, w tym adres IP, w celu obsługi zgłoszenia, zapewnienia bezpieczeństwa i przeciwdziałania nadużyciom.

9.3. Logi służą wyłącznie celom technicznym, diagnostyce i bezpieczeństwu. Nie są wykorzystywane do identyfikowania Użytkowników ani do celów marketingowych.

#### 10. Prawa osoby, której dane dotyczą

10.1. Przysługuje Ci prawo do:

- dostępu do danych,
- sprostowania danych,
- usunięcia danych,
- ograniczenia przetwarzania,
- przenoszenia danych,
- sprzeciwu wobec przetwarzania opartego na art. 6 ust. 1 lit. f RODO,
- wycofania zgody w dowolnym momencie, bez wpływu na zgodność z prawem przetwarzania dokonanego przed jej wycofaniem,
- złożenia skargi do Prezesa Urzędu Ochrony Danych Osobowych (uodo.gov.pl).

10.2. Żądania prosimy kierować na adres damian@demrise.pl lub pisemnie na adres siedziby Spółki. Zgodę na statystyki możesz wycofać samodzielnie w każdej chwili przyciskiem „Cookies” w rogu strony.

#### 11. Pliki cookies i pamięć przeglądarki

11.1. Bez zgody Użytkownika Serwis nie zapisuje plików cookies i nie ładuje narzędzi analitycznych. W pamięci przeglądarki (localStorage) zapisuje jedynie informację o decyzji Użytkownika dotyczącej statystyk, żeby nie pytać o nią przy każdej wizycie. Ta informacja jest niezbędna do działania banera i nie wymaga zgody.

11.2. Przy pierwszej wizycie Serwis wyświetla baner, w którym Użytkownik może wyrazić zgodę na statystyki („Zgoda”) albo jej odmówić („Odrzuć”). Decyzję można w każdej chwili zmienić przyciskiem „Cookies” w rogu strony. Odmowa nie ogranicza korzystania z Serwisu. Po odmowie lub wycofaniu zgody Serwis usuwa pliki cookies Google Analytics.

11.3. Dopiero po wyrażeniu zgody Serwis ładuje Google Tag Manager i Google Analytics 4, które zapisują pliki cookies _ga oraz _ga_* (ważne do 2 lat) w celu rozróżniania odwiedzających i liczenia statystyk odwiedzin. Serwis przekazuje do Google Analytics informacje o odwiedzinach i kliknięciach w Serwisie, w tym o skorzystaniu z formularza oferty, ale nigdy adresu e-mail. Sygnały Google i inne funkcje reklamowe Google Analytics są wyłączone. Użytkownik może również skorzystać z dodatku blokującego Google Analytics: tools.google.com/dlpage/gaoptout.

11.4. Serwis nie korzysta z plików cookies reklamowych ani narzędzi remarketingowych, w tym Meta Pixel (Facebook Pixel).

#### 12. Zmiany Polityki

12.1. Polityka podlega okresowym przeglądom i może być aktualizowana w przypadku zmian prawnych, organizacyjnych lub technologicznych. Nowa wersja będzie publikowana w Serwisie wraz z datą obowiązywania.

