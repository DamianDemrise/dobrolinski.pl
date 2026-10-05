import { siteContent } from './site'

const SITE_URL = 'https://dobrolinski.pl'
const NUMBER = '01'
const NAME = 'POZNAJ CZŁOWIEKA'

/**
 * Warsztat POZNAJ CZŁOWIEKA: jedyne źródło treści strony /poznaj-czlowieka
 * i danych produktu. Wszystko tutaj jest publiczne (repo i build).
 * Ceny pilotażowej celowo tu nie ma: Damian proponuje ją indywidualnie.
 */
export const workshop = {
  slug: 'poznaj-czlowieka',
  path: '/poznaj-czlowieka',
  number: NUMBER,
  name: NAME,
  index: `${NUMBER} / ${NAME}`,
  homeLabel: 'Teraz',
  mailSubject: 'Warsztat POZNAJ CZŁOWIEKA',
  title: 'Na końcu każdej sprzedaży jest człowiek.',
  subtitle: 'Warsztat o sprzedaży, relacjach i pracy z ludźmi.',
  seo: {
    title: 'Poznaj Człowieka | Damian Dobroliński',
    description:
      'Warsztat o sprzedaży, relacjach i codziennej pracy z ludźmi. Bez skryptów i magicznych technik. Prawdziwe historie, rozmowa i praktyka.',
    url: `${SITE_URL}/poznaj-czlowieka`,
    /* Krótszy tytuł i opis do podglądów linków (OG, X). Pełny <title> i description zostają wyżej. */
    socialTitle: 'Poznaj Człowieka | Damian Dobroliński',
    socialDescription:
      'Warsztat o sprzedaży, relacjach i pracy z ludźmi. Bez skryptów i magicznych technik. Prawdziwe historie, rozmowa i praktyka.',
    image: `${SITE_URL}/og-poznaj-czlowieka.png`,
    imageAlt: 'POZNAJ CZŁOWIEKA. Na końcu każdej sprzedaży jest człowiek. Warsztat Damiana Dobrolińskiego.',
  },

  format: {
    duration: 'Około 6 godzin + przerwy',
    audience: 'Dla właścicieli firm i osób pracujących z klientem',
    type: 'Warsztat zamknięty dla jednej firmy',
    group: 'Zamknięta grupa, docelowo około 10 osób',
  },
  regularPrice: {
    amount: 4900,
    currency: 'PLN',
    net: true,
    label: '4 900 zł netto',
  },

  hero: {
    titleLines: ['Na końcu każdej', 'sprzedaży jest człowiek.'],
    lead: 'Warsztat o sprzedaży, relacjach i pracy z ludźmi.',
    descriptionLines: [
      'Historie z prawdziwego życia. Rozmowa. Ćwiczenia. Dyskusja.',
      'Bez skryptów. Bez magicznych technik.',
      'Tylko praktyka i ludzie.',
    ],
    meta: [
      { label: 'CZAS', lines: ['Około 6 godzin', '+ przerwy'] },
      { label: 'DLA KOGO', lines: ['Dla właścicieli firm', 'i osób pracujących z klientem'] },
      { label: 'FORMA', lines: ['Warsztat zamknięty', 'dla jednej firmy'] },
    ],
    cta: 'Porozmawiajmy o warsztacie',
    more: 'Więcej o warsztacie',
  },

  manifest: {
    quietLine: 'Nie uczę sprzedawać.',
    strongLine: 'Uczę rozmawiać z ludźmi.',
    followLines: ['Najpierw trzeba zrozumieć człowieka.', 'Potem możemy rozmawiać o sprzedaży.'],
  },
  noScript: {
    title: 'Nie dostaniesz ode mnie skryptu rozmowy.',
    lines: ['Nie będzie siedmiu sposobów na zamknięcie sprzedaży.'],
    reason: 'Bo klient po drugiej stronie nie przeczytał naszego skryptu.',
    statement: 'Każdy jest inny.',
  },
  beliefs: {
    eyebrow: 'KILKA RZECZY, W KTÓRE WIERZĘ',
    items: [
      ['Najpierw posłuchaj.', 'Potem sprzedawaj.'],
      ['Nie każda sprzedaż', 'powinna się wydarzyć.'],
      ['„Nie wiem”', 'też jest dobrą odpowiedzią.'],
      ['Klient nie ma obowiązku', 'znać Twojej branży.'],
      ['Marketing przyprowadził człowieka.', 'Dalej musisz już z nim porozmawiać.'],
    ],
  },
  program: {
    eyebrow: 'O CZYM BĘDZIEMY ROZMAWIAĆ',
    topics: [
      {
        number: '01',
        titleLines: ['Dla mnie to był samochód.', 'Dla nich kawał życia.'],
        textLines: ['O tym, jak łatwo zapomnieć, że dla nas to kolejny klient, a dla niego zakup może być naprawdę ważnym momentem.'],
      },
      {
        number: '02',
        titleLines: ['Sprzedaj mi Superba.'],
        textLines: ['Zanim zaczniesz opowiadać o produkcie, dowiedz się, czego właściwie potrzebuje człowiek przed Tobą.'],
      },
      {
        number: '03',
        titleLines: ['Za drogo.'],
        textLines: [
          '„Za drogo” samo w sobie niewiele znaczy.',
          'Najpierw trzeba dowiedzieć się: za drogo w porównaniu z czym?',
        ],
      },
      {
        number: '04',
        titleLines: ['Ja bym Ci tego nie sprzedał.'],
        textLines: ['Czasami najlepsza sprzedaż zaczyna się od powiedzenia klientowi, że powinien kupić coś innego.'],
      },
      {
        number: '05',
        titleLines: ['Sprzedaż to dopiero początek.'],
        textLines: ['Faktura kończy transakcję.', 'Nie musi kończyć relacji.'],
      },
    ],
  },
  groundRules: {
    eyebrow: 'NA TYM WARSZTACIE',
    items: [
      ['Można się ze mną nie zgadzać.'],
      ['Można powiedzieć,', 'że u Was to nie działa.'],
      ['I właśnie o to chodzi.'],
    ],
  },
  workshopParts: [
    {
      number: '01',
      name: 'CZŁOWIEK',
      lines: ['Potrzeby.', 'Słuchanie.', 'Pierwsze wrażenie.', 'Indywidualne podejście.'],
      closing: 'Klient jako człowiek, nie numer.',
    },
    {
      number: '02',
      name: 'SPRZEDAŻ',
      lines: ['Cena.', '„Za drogo”.', 'Rabaty.', 'Granice.', 'Uczciwość.'],
      closing: 'I sytuacje, w których nie warto sprzedawać.',
    },
    {
      number: '03',
      name: 'RELACJA',
      lines: ['Co dzieje się po sprzedaży.', 'Powroty klientów.', 'Rekomendacje.', 'Małe rzeczy, które zostają w pamięci.'],
      closing: '',
    },
    {
      number: '04',
      name: 'WASZA FIRMA',
      lines: ['Pracujemy na prawdziwych sytuacjach, z którymi spotyka się Wasz zespół.'],
      closing: '',
    },
  ],
  yourStories: {
    quietLine: 'Tu kończą się moje historie.',
    strongLine: 'Zaczynają Wasze.',
    caption: 'SYTUACJE, NA KTÓRYCH MOŻEMY PRACOWAĆ',
    situations: [
      ['Konkurencja ma taniej.'],
      ['Ile rabatu?'],
      ['Muszę się zastanowić.'],
      ['Nie wiem, czego potrzebuję.'],
      ['Lead przyszedł z reklamy.', 'Co dalej?'],
    ],
  },
  about: {
    titleLines: ['Sprzedaży nauczyli mnie ludzie,', 'nie książki.'],
    paragraphs: [
      ['Sprzedawałem naprawdę różne rzeczy.'],
      ['Od ubrań, kwiatów i warzyw,', 'przez farby,', 'aż po samochody.'],
      ['Dzisiaj zajmuję się marketingiem', 'i technologią.'],
      ['Produkty się zmieniały.'],
      ['Jedna rzecz została:', 'po drugiej stronie zawsze był człowiek.'],
    ],
  },
  audience: {
    eyebrow: 'DLA KOGO',
    titleLines: ['Jeśli pracujesz z ludźmi,', 'prawdopodobnie znajdziemy', 'wspólny język.'],
    people: ['Właściciele firm.', 'Handlowcy.', 'Doradcy.', 'Obsługa klienta.', 'Zespoły sprzedażowe.'],
    detailsLines: ['Warsztat zamknięty dla jednej firmy.', 'Około 6 godzin + przerwy.'],
  },
  /** Nie renderowane na stronie (powtarzało wcześniejsze myśli); zostaje do oferty PDF. */
  outcomes: {
    intro: 'Jeżeli po tym spotkaniu…',
    items: [
      ['…zadajesz klientowi jedno pytanie więcej,', 'zanim zaczniesz mu coś sprzedawać…'],
      ['…chwilę dłużej słuchasz,', 'zanim zaczniesz odpowiadać…'],
      ['…nie panikujesz,', 'kiedy słyszysz „za drogo”…'],
      ['…potrafisz powiedzieć:', '„tego Ci nie polecam”…'],
      ['…pamiętasz o człowieku', 'również po wystawieniu faktury…'],
    ],
    conclusion: 'to już coś zmieniliśmy.',
  },
  process: {
    title: 'Jak wygląda współpraca',
    steps: [
      {
        id: 'before',
        label: 'PRZED',
        lead: '30–45 minut rozmowy z właścicielem lub managerem.',
        lines: ['Poznaję firmę, zespół, klientów i prawdziwe sytuacje.'],
        note: 'Na tej podstawie dopasowuję część warsztatu.',
      },
      {
        id: 'during',
        label: 'W TRAKCIE',
        lead: 'Około 6 godzin + przerwy.',
        lines: ['Historie. Rozmowa. Ćwiczenia. Dyskusja.', 'Prawdziwe przypadki zespołu.'],
        note: '',
      },
      {
        id: 'after',
        label: 'PO',
        lead: 'Jedna strona: „Co zabieramy ze sobą?”',
        lines: ['5–7 najważniejszych rzeczy, które wypracował konkretny zespół.'],
        note: '',
      },
    ],
    priceIncludes: [
      'rozmowa przed warsztatem',
      'przygotowanie i dopasowanie części warsztatu',
      'około 6 godzin + przerwy',
      'praca na przypadkach firmy',
      'jednostronicowe podsumowanie po warsztacie',
    ],
  },
  offer: {
    title: 'Chcesz zobaczyć całość?',
    lines: ['Przygotowałem krótką ofertę warsztatu', 'z programem, sposobem pracy i organizacją.'],
    label: 'Twój e-mail',
    submit: 'Wyślij mi ofertę',
    sending: 'Wysyłam...',
    note: ['Bez newslettera.', 'Dostaniesz tylko ofertę.'],
    success: { title: 'Poszło.', text: 'Sprawdź skrzynkę.', hint: 'Jeżeli nic nie przyszło w ciągu kilku minut, sprawdź spam.' },
    errors: {
      empty: 'Wpisz adres e-mail.',
      invalid: 'To nie wygląda na adres e-mail. Sprawdź go jeszcze raz.',
      failed: 'Nie udało się wysłać oferty.',
      failedHint: 'Spróbuj ponownie albo napisz:',
    },
  },
  closing: {
    title: 'A jak jest u Was?',
    paragraphs: [
      'Każda firma pracuje inaczej.',
      'Dlatego zanim przyjadę z warsztatem, chcę poznać Was, Waszych klientów i sytuacje, z którymi naprawdę się spotykacie.',
    ],
    cta: 'Porozmawiajmy',
  },
  epilogue: ['Bądźmy po prostu dobrzy dla ludzi.', 'Bo na końcu i tak zostaje człowiek.'],
} as const

export const workshopMailHref = `mailto:${siteContent.email}?subject=${encodeURIComponent(workshop.mailSubject)}`
