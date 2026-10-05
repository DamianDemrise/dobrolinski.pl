/**
 * Polityka prywatności dobrolinski.pl. Baza: polityka Demrise sp. z o.o.
 * (demrise.pl/polityka-prywatnosci, wersja z 15.01.2026), dostosowana do tego,
 * co Serwis faktycznie robi. Zgodność z kodem: docs/PRIVACY-AUDIT.md.
 *
 * Linki w tekście: [[adres|etykieta]]. Bez HTML, renderuje PrivacyView.vue.
 */
// Wariant docelowy (decyzja Damiana 05.10.2026): biuro@demrise.pl, o ile skrzynka jest obsługiwana.
const ADMIN_MAIL = 'biuro@demrise.pl'
const PROJECT_MAIL = 'damian@dobrolinski.pl'

export type PrivacyBlock = string | { list: string[] }

export interface PrivacySection {
  id: string
  title: string
  blocks: PrivacyBlock[]
}

export const privacy = {
  seo: {
    title: 'Polityka prywatności | Damian Dobroliński',
    description: 'Polityka prywatności serwisu dobrolinski.pl.',
    url: 'https://dobrolinski.pl/polityka-prywatnosci',
  },
  title: 'Polityka prywatności',
  site: 'dobrolinski.pl',
  /** Ustawić na dzień publikacji. */
  effectiveDate: '5 października 2026 r.',
  sections: [
    {
      id: 'administrator',
      title: '1. Administrator danych osobowych',
      blocks: [
        '1.1. Administratorem danych osobowych Użytkowników serwisu dobrolinski.pl oraz www.dobrolinski.pl (dalej: „Serwis”) jest Demrise sp. z o.o. z siedzibą przy ul. Floriańskiej 55, 08-110 Siedlce, wpisana do rejestru przedsiębiorców KRS pod numerem 0001157533, NIP 821-269-69-09, REGON 540982054, o kapitale zakładowym w wysokości 5 000,00 zł wpłaconym w całości (dalej: „Administrator” lub „Spółka”).',
        '1.2. Serwis jest projektem Damiana Dobrolińskiego realizowanym w ramach działalności Demrise sp. z o.o.',
        `1.3. We wszelkich sprawach związanych z przetwarzaniem danych osobowych prosimy o kontakt pod adresem e-mail: [[mailto:${ADMIN_MAIL}|${ADMIN_MAIL}]]. W sprawach dotyczących samego projektu możesz pisać także na [[mailto:${PROJECT_MAIL}|${PROJECT_MAIL}]].`,
      ],
    },
    {
      id: 'podstawy',
      title: '2. Przetwarzanie danych osobowych: informacje podstawowe',
      blocks: [
        '2.1. Wszelkie dane osobowe są gromadzone, przechowywane i przetwarzane zgodnie z Rozporządzeniem Parlamentu Europejskiego i Rady (UE) 2016/679 z dnia 27 kwietnia 2016 r. w sprawie ochrony osób fizycznych w związku z przetwarzaniem danych osobowych i w sprawie swobodnego przepływu takich danych oraz uchylenia dyrektywy 95/46/WE („RODO”).',
        '2.2. Serwis nie wymaga rejestracji ani logowania. Użytkownik przekazuje dane osobowe tylko wtedy, gdy sam z tego skorzysta:',
        {
          list: [
            'w formularzu „Wyślij mi ofertę” na stronie /poznaj-czlowieka podaje wyłącznie adres e-mail,',
            'pisząc wiadomość e-mail podaje adres e-mail, treść wiadomości i dane, które sam w niej umieści.',
          ],
        },
        '2.3. Dane osobowe są chronione przed dostępem osób nieuprawnionych. Administrator nie przetwarza w Serwisie szczególnych kategorii danych.',
        '2.4. Administrator nie podejmuje wobec Użytkowników decyzji opartych wyłącznie na zautomatyzowanym przetwarzaniu, które wywoływałyby skutki prawne lub w podobny sposób istotnie na nich wpływały, i nie profiluje Użytkowników. Automatyczne wysłanie oferty po wypełnieniu formularza jest wyłącznie realizacją prośby Użytkownika.',
      ],
    },
    {
      id: 'cele',
      title: '3. Cele i podstawy prawne przetwarzania danych',
      blocks: [
        {
          list: [
            // DO POTWIERDZENIA PRZEZ PRAWNIKA: podział lit. b / lit. f.
            'Przesłanie zamówionej oferty warsztatu „Poznaj Człowieka”: art. 6 ust. 1 lit. b RODO (działania podejmowane na żądanie osoby, której dane dotyczą, przed zawarciem umowy), gdy prosisz o ofertę we własnym imieniu; gdy działasz w imieniu firmy lub organizacji, która może zawrzeć umowę, art. 6 ust. 1 lit. f RODO (prawnie uzasadniony interes Administratora polegający na odpowiedzi na prośbę o ofertę i kontakcie z przedstawicielem potencjalnego kontrahenta).',
            'Obsługa korespondencji, w tym odpowiedzi na ofertę: art. 6 ust. 1 lit. b RODO, gdy korespondencja dotyczy zawarcia lub wykonania umowy, a w pozostałym zakresie art. 6 ust. 1 lit. f RODO (prawnie uzasadniony interes Administratora polegający na prowadzeniu korespondencji).',
            'Zapewnienie bezpieczeństwa Serwisu, w tym ochrona formularza przed nadużyciami i automatycznymi zgłoszeniami: art. 6 ust. 1 lit. f RODO.',
            'Statystyka odwiedzin (Google Analytics 4): art. 6 ust. 1 lit. a RODO (zgoda wyrażona w banerze Serwisu).',
            'Zapamiętanie decyzji Użytkownika dotyczącej statystyk: art. 6 ust. 1 lit. f RODO (wykazanie i respektowanie wyboru Użytkownika).',
            'Ustalenie, dochodzenie lub obrona roszczeń: art. 6 ust. 1 lit. f RODO.',
          ],
        },
      ],
    },
    {
      id: 'formularz',
      title: '4. Formularz „Wyślij mi ofertę”',
      blocks: [
        '4.1. Podając adres e-mail w formularzu, Użytkownik prosi o przesłanie oferty warsztatu „Poznaj Człowieka”. Na ten adres wysyłana jest automatycznie jedna wiadomość z ofertą w formacie PDF w załączniku oraz z linkiem do tej samej oferty w Serwisie.',
        '4.2. Podanie adresu e-mail jest dobrowolne, ale bez niego nie możemy wysłać oferty.',
        '4.3. Podanie adresu e-mail nie zapisuje Użytkownika do newslettera, nie jest zgodą na otrzymywanie informacji marketingowych i nie powoduje dopisania adresu do żadnej listy marketingowej. Administrator nie wysyła na ten adres kolejnych wiadomości, chyba że Użytkownik sam odpowie na ofertę albo napisze.',
        '4.4. Po wysłaniu oferty Damian Dobroliński otrzymuje wiadomość z informacją o prośbie: adres e-mail Użytkownika, datę oraz stronę i parametry kampanii (UTM), z których nastąpiło wejście, jeżeli były w adresie strony. Serwis nie prowadzi osobnej bazy adresów.',
        '4.5. Aby chronić formularz przed nadużyciami, przy wysłaniu formularza przetwarzane są również dane techniczne, w tym adres IP. Służą one wyłącznie do ograniczania liczby zgłoszeń i blokowania automatycznych prób, są przechowywane w postaci skrótu kryptograficznego i usuwane automatycznie najpóźniej po upływie doby.',
      ],
    },
    {
      id: 'odbiorcy',
      title: '5. Odbiorcy danych osobowych',
      blocks: [
        '5.1. Dane osobowe mogą być przekazywane podmiotom świadczącym usługi na rzecz Spółki, wyłącznie w zakresie niezbędnym do realizacji celu przetwarzania. W Serwisie są to:',
        {
          list: [
            // DO POTWIERDZENIA PRZEZ PRAWNIKA: GitHub Free bez DPA, rola GitHub wobec logów.
            'GitHub, Inc. (USA): hosting Serwisu w usłudze GitHub Pages; dane techniczne połączeń są przetwarzane na zasadach określonych w warunkach korzystania z usługi i polityce prywatności GitHub,',
            'Cloudflare, Inc. (USA): infrastruktura obsługująca formularz „Wyślij mi ofertę”, na podstawie umowy powierzenia przetwarzania danych,',
            'Plus Five Five, Inc., działająca jako Resend (USA): wysyłka wiadomości z ofertą i powiadomienia z serwerów zlokalizowanych w Irlandii, na podstawie umowy powierzenia przetwarzania danych,',
            'Google (Google Ireland Limited oraz Google LLC): obsługa poczty e-mail w domenie dobrolinski.pl (Google Workspace) oraz, po wyrażeniu zgody, statystyka Google Analytics 4.',
          ],
        },
        '5.2. Dane mogą zostać udostępnione organom publicznym wyłącznie wtedy, gdy obowiązek taki wynika z przepisów prawa.',
      ],
    },
    {
      id: 'eog',
      title: '6. Przekazywanie danych poza Europejski Obszar Gospodarczy',
      blocks: [
        '6.1. Dostawcy wymienieni w punkcie 5 mają siedzibę lub podmioty powiązane w Stanach Zjednoczonych, dlatego dane mogą być przekazywane poza Europejski Obszar Gospodarczy.',
        '6.2. Przekazanie odbywa się na podstawie decyzji Komisji Europejskiej stwierdzającej odpowiedni stopień ochrony w ramach EU-US Data Privacy Framework, w odniesieniu do dostawców, którzy przystąpili do tego programu, a uzupełniająco na podstawie standardowych klauzul umownych przyjętych przez Komisję Europejską.',
      ],
    },
    {
      id: 'ochrona',
      title: '7. Ochrona danych',
      blocks: [
        '7.1. Serwis działa wyłącznie przez szyfrowane połączenie HTTPS (TLS). Klucze dostępowe do usług zewnętrznych są przechowywane wyłącznie po stronie serwera i nie trafiają do przeglądarki Użytkownika. Dostęp do danych mają wyłącznie osoby upoważnione przez Administratora.',
        '7.2. Formularz przyjmuje tylko adres e-mail i wysyła wyłącznie ustaloną wiadomość z ofertą. Zgłoszenia są weryfikowane, a ich liczba jest ograniczana.',
      ],
    },
    {
      id: 'retencja',
      title: '8. Okres przechowywania danych',
      blocks: [
        {
          list: [
            'adres e-mail z formularza w systemie wysyłki wiadomości: do 30 dni,',
            'wiadomości e-mail w skrzynce pocztowej Administratora, w tym powiadomienie o prośbie o ofertę i dalsza korespondencja: przez czas prowadzenia korespondencji i ewentualnej współpracy, a po ich zakończeniu nie dłużej niż do upływu terminów przedawnienia roszczeń lub okresu wymaganego przepisami prawa; na Twoje żądanie usuniemy je wcześniej, jeżeli nie ma podstawy do ich dalszego przechowywania,',
            'dane techniczne służące ochronie formularza: najpóźniej do upływu doby,',
            'logi techniczne formularza (czas i wynik zgłoszenia, bez adresu e-mail i adresu IP): do 3 dni,',
            'dane statystyczne Google Analytics 4: dane o zdarzeniach do 2 miesięcy, dane na poziomie użytkownika do 14 miesięcy od ostatniej aktywności, następnie wyłącznie w formie zagregowanej,',
            'pliki cookies i dane w pamięci przeglądarki: zgodnie z czasem ich ważności (punkt 11) lub do usunięcia przez Użytkownika.',
          ],
        },
      ],
    },
    {
      id: 'logi',
      title: '9. Logi systemowe',
      blocks: [
        '9.1. Przy każdym wejściu do Serwisu dostawca hostingu (GitHub) zapisuje adres IP odwiedzającego w celach bezpieczeństwa, na zasadach opisanych w dokumentacji GitHub. Logi mogą zawierać również znacznik czasu i informacje techniczne o przeglądarce.',
        '9.2. Przy wysłaniu formularza infrastruktura Cloudflare przetwarza dane techniczne połączenia, w tym adres IP, w celu obsługi zgłoszenia, zapewnienia bezpieczeństwa i przeciwdziałania nadużyciom.',
        '9.3. Logi służą wyłącznie celom technicznym, diagnostyce i bezpieczeństwu. Nie są wykorzystywane do identyfikowania Użytkowników ani do celów marketingowych.',
      ],
    },
    {
      id: 'prawa',
      title: '10. Prawa osoby, której dane dotyczą',
      blocks: [
        '10.1. Przysługuje Ci prawo do:',
        {
          list: [
            'dostępu do danych,',
            'sprostowania danych,',
            'usunięcia danych,',
            'ograniczenia przetwarzania,',
            'przenoszenia danych,',
            'sprzeciwu wobec przetwarzania opartego na art. 6 ust. 1 lit. f RODO,',
            'wycofania zgody w dowolnym momencie, bez wpływu na zgodność z prawem przetwarzania dokonanego przed jej wycofaniem,',
            'złożenia skargi do Prezesa Urzędu Ochrony Danych Osobowych ([[https://uodo.gov.pl|uodo.gov.pl]]).',
          ],
        },
        `10.2. Żądania prosimy kierować na adres [[mailto:${ADMIN_MAIL}|${ADMIN_MAIL}]] lub pisemnie na adres siedziby Spółki. Zgodę na statystyki możesz wycofać samodzielnie w każdej chwili przyciskiem „Cookies” w rogu strony.`,
      ],
    },
    {
      id: 'cookies',
      title: '11. Pliki cookies i pamięć przeglądarki',
      blocks: [
        '11.1. Bez zgody Użytkownika Serwis nie zapisuje plików cookies i nie ładuje narzędzi analitycznych. W pamięci przeglądarki (localStorage) zapisuje jedynie informację o decyzji Użytkownika dotyczącej statystyk, żeby nie pytać o nią przy każdej wizycie. Ta informacja jest niezbędna do działania banera i nie wymaga zgody.',
        '11.2. Przy pierwszej wizycie Serwis wyświetla baner, w którym Użytkownik może wyrazić zgodę na statystyki („Zgoda”) albo jej odmówić („Odrzuć”). Decyzję można w każdej chwili zmienić przyciskiem „Cookies” w rogu strony. Odmowa nie ogranicza korzystania z Serwisu. Po odmowie lub wycofaniu zgody Serwis usuwa pliki cookies Google Analytics.',
        '11.3. Dopiero po wyrażeniu zgody Serwis ładuje Google Tag Manager i Google Analytics 4, które zapisują pliki cookies _ga oraz _ga_* (ważne do 2 lat) w celu rozróżniania odwiedzających i liczenia statystyk odwiedzin. Serwis przekazuje do Google Analytics informacje o odwiedzinach i kliknięciach w Serwisie, w tym o skorzystaniu z formularza oferty, ale nigdy adresu e-mail. Sygnały Google i inne funkcje reklamowe Google Analytics są wyłączone. Użytkownik może również skorzystać z dodatku blokującego Google Analytics: [[https://tools.google.com/dlpage/gaoptout|tools.google.com/dlpage/gaoptout]].',
        '11.4. Serwis nie korzysta z plików cookies reklamowych ani narzędzi remarketingowych, w tym Meta Pixel (Facebook Pixel).',
      ],
    },
    {
      id: 'zmiany',
      title: '12. Zmiany Polityki',
      blocks: [
        '12.1. Polityka podlega okresowym przeglądom i może być aktualizowana w przypadku zmian prawnych, organizacyjnych lub technologicznych. Nowa wersja będzie publikowana w Serwisie wraz z datą obowiązywania.',
      ],
    },
  ] satisfies PrivacySection[],
  back: 'Wróć',
} as const

export type LinkSegment = string | { href: string, label: string }

/** Rozbija tekst z [[adres|etykieta]] na zwykły tekst i linki (bez v-html). */
export function linkSegments(text: string): LinkSegment[] {
  const parts: LinkSegment[] = []
  let last = 0
  for (const match of text.matchAll(/\[\[([^|\]]+)\|([^\]]+)\]\]/g)) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    parts.push({ href: match[1]!, label: match[2]! })
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}
