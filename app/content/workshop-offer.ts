/**
 * Oferta warsztatu POZNAJ CZŁOWIEKA: struktura produktu pod późniejszy PDF.
 * Nie jest renderowana na stronie. Teksty wspólne ze stroną (hasło, lead,
 * manifest, kontakt) są pobierane z workshop.ts i site.ts, nie kopiowane.
 * Zasada: bez statystyk, procentów i obietnic wyniku.
 */
import { siteContent } from './site'
import { workshop } from './workshop'

export const workshopOffer = {
  product: {
    name: workshop.name,
    claim: workshop.hero.titleLines.join(' '),
    lead: workshop.hero.lead,
  },

  format: {
    company: '1 firma',
    team: '1 zespół',
    group: 'zamknięta grupa do około 10 osób',
    duration: 'około 6 godzin + przerwy',
    type: 'warsztat zamknięty',
  },

  process: {
    before: {
      title: 'PRZED WARSZTATEM',
      items: [
        'Rozmowa 30–45 minut z właścicielem lub managerem.',
        'Poznanie firmy i sposobu pracy z klientami.',
        'Poznanie najczęstszych problemów i obiekcji.',
        'Zebranie prawdziwych sytuacji z firmy.',
        'Dopasowanie części warsztatu.',
      ],
    },
    workshop: {
      title: 'WARSZTAT',
      parts: [
        {
          numeral: 'I',
          name: 'CZŁOWIEK',
          items: [
            'potrzeby',
            'słuchanie',
            'pierwsze wrażenie',
            'indywidualne podejście',
            'klient jako człowiek, nie numer',
          ],
        },
        {
          numeral: 'II',
          name: 'SPRZEDAŻ',
          items: [
            'cena',
            '„za drogo”',
            'rabaty',
            'granice',
            'uczciwość',
            'sytuacje, w których nie warto sprzedawać',
          ],
        },
        {
          numeral: 'III',
          name: 'RELACJA',
          items: [
            'co dzieje się po sprzedaży',
            'powroty klientów',
            'rekomendacje',
            'małe rzeczy, które zostają w pamięci',
            'długoterminowa wartość relacji',
          ],
        },
        {
          numeral: 'IV',
          name: 'WASZA FIRMA',
          intro: 'Praca na prawdziwych sytuacjach uczestników.',
          examples: [
            '„Konkurencja ma taniej.”',
            '„Ile rabatu?”',
            '„Muszę się zastanowić.”',
            '„Nie wiem czego potrzebuję.”',
            '„Lead przyszedł z reklamy — co dalej?”',
          ],
          note: 'Ta część nie jest wykładem. To rozmowa i praca z zespołem.',
        },
      ],
    },
    after: {
      title: 'PO WARSZTACIE',
      summaryTitle: 'CO ZABIERAMY ZE SOBĄ?',
      text: 'Krótkie, jednostronicowe podsumowanie: 5–7 najważniejszych rzeczy wypracowanych podczas warsztatu przez konkretny zespół.',
    },
  },

  /** Cel warsztatu, bez obietnic liczbowych. */
  outcomes: [
    'zadają więcej właściwych pytań',
    'więcej słuchają',
    'lepiej rozumieją potrzeby klienta',
    'potrafią dojść, co naprawdę oznacza „za drogo”',
    'nie panikują przy rozmowie o cenie',
    'potrafią powiedzieć klientowi „tego Ci nie polecam”',
    'inaczej patrzą na relację po sprzedaży',
    'widzą człowieka za leadem, CRM-em i fakturą',
  ],
  outcomesIntro: 'Po warsztacie uczestnicy:',

  pilot: {
    title: 'EDYCJA PILOTAŻOWA',
    slots: 3,
    scope: 'dla jednej firmy, zamknięta grupa do około 10 osób',
    includes: [
      'rozmowa przed warsztatem',
      'przygotowanie i dopasowanie',
      'około 6 godzin warsztatu + przerwy',
      'praca na przypadkach firmy',
      'jednostronicowe podsumowanie po warsztacie',
    ],
    narrative: [
      'Pierwsze trzy warsztaty przeprowadzam w formule pilotażowej.',
      'Chcę sprawdzić format na różnych zespołach i dopracować go na podstawie ich doświadczeń.',
      'W zamian chcę otrzymać szczerą ocenę warsztatu.',
    ],
    /** Zgoda na opinię nie jest zakładana: pytamy osobno, po warsztacie. */
    testimonialNote:
      'Jeżeli firma będzie zadowolona, możemy osobno zapytać o możliwość wykorzystania opinii.',
  },

  contact: {
    name: siteContent.name,
    email: siteContent.email,
    website: 'dobrolinski.pl',
  },
} as const

/** Układ 6-stronicowego PDF: każda strona wskazuje bloki treści z workshopOffer i workshop. */
export const workshopOfferPages = [
  { page: 1, title: workshopOffer.product.name, blocks: ['product.claim', 'product.lead'] },
  { page: 2, title: `${workshop.manifest.quietLine} ${workshop.manifest.strongLine}`, blocks: ['manifest.followLines', 'noScript'] },
  { page: 3, title: 'O czym będziemy rozmawiać', blocks: ['process.workshop.parts'] },
  { page: 4, title: 'Jak wygląda współpraca', blocks: ['process.before', 'process.workshop', 'process.after'] },
  { page: 5, title: 'Dla kogo / organizacja', blocks: ['audience.people', 'format', 'outcomes'] },
  { page: 6, title: workshopOffer.pilot.title, blocks: ['pilot', 'contact'] },
] as const
