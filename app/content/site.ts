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
      thought: 'Od tego zaczyna się cała reszta.',
    },
    {
      label: 'Sprzedaż',
      slug: 'sales',
      thought: 'Najpierw posłuchaj. Potem sprzedawaj.',
    },
    {
      label: 'Marketing',
      slug: 'marketing',
      thought: 'Marketing przyprowadza człowieka. Co zrobisz później?',
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
  consent: {
    label: 'Zgoda na statystyki',
    text: 'Za Twoją zgodą korzystam z Google Analytics, żeby wiedzieć, ile osób odwiedza stronę. Bez zgody nic nie jest mierzone.',
    accept: 'Zgoda',
    reject: 'Odrzuć',
    reopen: 'Cookies',
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
