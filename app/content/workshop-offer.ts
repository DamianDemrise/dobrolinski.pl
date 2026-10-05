/**
 * Układ 6-stronicowej oferty PDF warsztatu POZNAJ CZŁOWIEKA.
 * Nie jest renderowany na stronie. Treść pochodzi z workshop.ts (jedno źródło),
 * tu jest tylko kolejność stron i wskazanie bloków.
 * Cena pilotażowa NIE należy do tego repozytorium (repo jest publiczne).
 */
import { siteContent } from './site'
import { workshop } from './workshop'

export const workshopOfferPages = [
  { page: 1, title: workshop.name, blocks: ['title', 'subtitle'] },
  { page: 2, title: `${workshop.manifest.quietLine} ${workshop.manifest.strongLine}`, blocks: ['manifest.followLines', 'noScript'] },
  { page: 3, title: 'O czym będziemy rozmawiać', blocks: ['workshopParts', 'yourStories.situations'] },
  { page: 4, title: workshop.process.title, blocks: ['process.steps'] },
  { page: 5, title: 'Dla kogo / organizacja', blocks: ['audience.people', 'format', 'outcomes'] },
  { page: 6, title: workshop.name, blocks: ['regularPrice', 'process.priceIncludes', 'contact'] },
] as const

export const workshopOfferContact = {
  name: siteContent.name,
  email: siteContent.email,
  website: 'dobrolinski.pl',
} as const
