export type AreaSlug = 'people' | 'sales' | 'marketing' | 'technology'

export interface Area {
  label: string
  slug: AreaSlug
  thought: string
}

export const siteContent = {
  name: 'Damian Dobroliński',
  email: 'damian@dobrolinski.pl',
  phoneDisplay: '538 531 888',
  phoneHref: 'tel:+48538531888',
  areas: [
    {
      label: 'Ludzie',
      slug: 'people',
      thought: 'To ludzie nadają sens każdej dobrej rozmowie.',
    },
    {
      label: 'Sprzedaż',
      slug: 'sales',
      thought: 'Nie sprzedajesz do skryptu. Rozmawiasz z człowiekiem.',
    },
    {
      label: 'Marketing',
      slug: 'marketing',
      thought: 'Dobry marketing zaczyna się od uważnego słuchania.',
    },
    {
      label: 'Technologia',
      slug: 'technology',
      thought: 'Technologia ma pomagać ludziom. Nie odwrotnie.',
    },
  ] satisfies Area[],
  thoughts: [
    'Na końcu każdej sprzedaży jest człowiek.',
    'Sprzedaży nauczyli mnie ludzie, nie książki.',
    'Lubię ludzi. Dlatego lubię sprzedaż.',
    'Sprzedaż to dopiero początek.',
    'Możesz kupić kliknięcia. Relacji z klientem nie kupisz.',
  ],
  workshop: {
    name: 'POZNAJ CZŁOWIEKA',
    index: '01 / POZNAJ CZŁOWIEKA',
    homeLabel: 'Teraz',
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
    mailSubject: 'Warsztat POZNAJ CZŁOWIEKA',
    approach: {
      titleLines: ['Nie uczę sprzedawać.', 'Uczę rozmawiać z ludźmi.'],
      followLines: ['Najpierw trzeba zrozumieć człowieka.', 'Potem możemy rozmawiać o sprzedaży.'],
    },
    difference: {
      title: 'To nie jest szkolenie z technik sprzedaży.',
      notLines: [
        'Nie będzie gotowych skryptów rozmów.',
        'Nie będzie siedmiu sposobów na zamknięcie sprzedaży.',
        'Nie będziemy uczyć się, co odpowiedzieć klientowi w punkcie 4B.',
      ],
      text: 'Będziemy rozmawiać o prawdziwych sytuacjach. O cenie, potrzebach, słuchaniu, zaufaniu, granicach i o tym, co dzieje się po sprzedaży.',
    },
    program: {
      eyebrow: 'O CZYM BĘDZIEMY ROZMAWIAĆ',
      topics: [
        {
          number: '01',
          titleLines: ['Dla mnie to był samochód.', 'Dla nich kawał życia.'],
          text: 'O tym, jak łatwo zapomnieć, że dla nas to kolejny klient, a dla niego zakup może być naprawdę ważnym momentem.',
        },
        {
          number: '02',
          titleLines: ['Sprzedaj mi Superba.'],
          text: 'Zanim zaczniesz opowiadać o produkcie, dowiedz się, czego właściwie potrzebuje człowiek przed Tobą.',
        },
        {
          number: '03',
          titleLines: ['Za drogo.'],
          text: '„Za drogo” samo w sobie niewiele znaczy. Najpierw trzeba dowiedzieć się — za drogo w porównaniu z czym?',
        },
        {
          number: '04',
          titleLines: ['Ja bym Ci tego nie sprzedał.'],
          text: 'Czasami najlepsza sprzedaż zaczyna się od powiedzenia klientowi, że powinien kupić coś innego.',
        },
        {
          number: '05',
          titleLines: ['Sprzedaż to dopiero początek.'],
          text: 'Faktura kończy transakcję. Nie musi kończyć relacji.',
        },
      ],
    },
    audience: {
      title: 'Dla kogo?',
      lead: 'Dla ludzi, którzy faktycznie pracują z ludźmi.',
      text: 'Właścicieli firm, handlowców, doradców, osób obsługujących klientów i zespołów, które chcą robić to lepiej — bez zamieniania ludzi w leady i numerki w CRM.',
    },
    closing: {
      title: 'A jak jest u Was?',
      text: 'Każda firma pracuje inaczej. Dlatego przed warsztatem chcę poznać Was, Waszych klientów i sytuacje, z którymi naprawdę się spotykacie.',
      cta: 'Porozmawiajmy o warsztacie',
    },
  },
} as const

export const personSchema = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: siteContent.name,
  url: 'https://dobrolinski.pl/',
  email: `mailto:${siteContent.email}`,
  telephone: '+48538531888',
  knowsAbout: siteContent.areas.map(area => area.label),
}

export const workshopMailHref = `mailto:${siteContent.email}?subject=${encodeURIComponent(siteContent.workshop.mailSubject)}`
