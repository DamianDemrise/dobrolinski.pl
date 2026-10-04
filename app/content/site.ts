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
    eyebrow: '01 / WARSZTAT',
    title: 'Na końcu każdej sprzedaży jest człowiek.',
    description:
      'Pracuję nad warsztatem o sprzedaży, relacjach i codziennej pracy z ludźmi.',
    statement:
      'Bez skryptów. Bez magicznych technik. Prawdziwe historie, sytuacje i rozmowy.',
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
