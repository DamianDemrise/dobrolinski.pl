import { siteContent } from './site'

const SITE_URL = 'https://dobrolinski.pl'

export const workshop = {
  slug: 'poznaj-czlowieka',
  path: '/poznaj-czlowieka',
  name: 'POZNAJ CZŁOWIEKA',
  index: '01 / POZNAJ CZŁOWIEKA',
  homeLabel: 'Teraz',
  mailSubject: 'Warsztat POZNAJ CZŁOWIEKA',
  seo: {
    title: 'Poznaj Człowieka — warsztat o sprzedaży i relacjach | Damian Dobroliński',
    description:
      'Warsztat o sprzedaży, relacjach i codziennej pracy z ludźmi. Bez skryptów i magicznych technik. Prawdziwe historie, rozmowa i praktyka.',
    url: `${SITE_URL}/poznaj-czlowieka`,
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
    lines: [
      'Nie będzie siedmiu sposobów na zamknięcie sprzedaży.',
      'Nie będziemy ćwiczyć odpowiedzi z punktu 4B.',
    ],
    reason: 'Bo klient po drugiej stronie nie przeczytał naszego skryptu.',
    statement: 'Każdy jest inny.',
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
  about: {
    titleLines: ['Sprzedaży nauczyli mnie ludzie,', 'nie książki.'],
    paragraphs: [
      ['Sprzedawałem różne rzeczy.', 'Znicze, skarpetki, farby, samochody.'],
      ['Dzisiaj zajmuję się marketingiem i technologią.'],
      ['Produkty się zmieniały.', 'Jedna rzecz została — po drugiej stronie zawsze był człowiek.'],
    ],
  },
  audience: {
    eyebrow: 'DLA KOGO',
    titleLines: ['Jeśli pracujesz z ludźmi,', 'prawdopodobnie znajdziemy', 'wspólny język.'],
    people: ['Właściciele firm.', 'Handlowcy.', 'Doradcy.', 'Obsługa klienta.', 'Zespoły sprzedażowe.'],
    detailsLines: ['Warsztat zamknięty dla jednej firmy.', 'Około 6 godzin + przerwy.'],
  },
  closing: {
    title: 'A jak jest u Was?',
    paragraphs: [
      'Każda firma pracuje inaczej.',
      'Dlatego zanim przyjadę z warsztatem, chcę poznać Was, Waszych klientów i sytuacje, z którymi naprawdę się spotykacie.',
    ],
    cta: 'Porozmawiajmy',
  },
} as const

export const workshopMailHref = `mailto:${siteContent.email}?subject=${encodeURIComponent(workshop.mailSubject)}`
