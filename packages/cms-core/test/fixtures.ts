import { defineBlock } from '../src/fields'
import type { PageDocument, SeoFields, SiteSchema } from '../src/types'

export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const v of Object.values(value)) deepFreeze(v)
  }
  return value
}

export const schema: SiteSchema = deepFreeze({
  blocks: {
    hero: defineBlock({
      type: 'hero',
      label: 'Hero',
      region: 'hero',
      maxPerPage: 1,
      restrictions: { movable: false, removable: false, hideable: false, duplicable: false },
      defaults: { title: 'Tytuł', variant: 'dark' },
      fields: [
        { key: 'title', label: 'Tytuł', type: 'text', required: true, maxLength: 20 },
        { key: 'lead', label: 'Lead', type: 'textarea' },
        { key: 'cta', label: 'CTA', type: 'link' },
        { key: 'image', label: 'Obraz', type: 'image' },
        { key: 'variant', label: 'Wariant', type: 'select', level: 'advanced', options: [{ value: 'dark', label: 'Ciemny' }, { value: 'light', label: 'Jasny' }] },
        { key: 'accent', label: 'Akcent', type: 'tokenColor', allowed: ['gold', 'ink'] },
        { key: 'customClass', label: 'Klasa', type: 'text', level: 'developer' },
        { key: 'metaNote', label: 'Notatka SEO', type: 'text', tab: 'seo' },
      ],
    }),
    text: defineBlock({
      type: 'text',
      label: 'Tekst',
      region: 'main',
      defaults: {},
      fields: [
        { key: 'heading', label: 'Nagłówek', type: 'text' },
        { key: 'body', label: 'Treść', type: 'textarea', maxLength: 500 },
        { key: 'lines', label: 'Linie', type: 'lines', maxItems: 2, maxLength: 10 },
        { key: 'size', label: 'Rozmiar', type: 'number', min: 1, max: 5 },
        { key: 'wide', label: 'Szeroki', type: 'toggle' },
        { key: 'align', label: 'Wyrównanie', type: 'select', responsive: true, options: [{ value: 'left', label: 'L' }, { value: 'center', label: 'C' }] },
      ],
    }),
    cards: defineBlock({
      type: 'cards',
      label: 'Karty',
      region: 'main',
      maxPerPage: 2,
      defaults: { items: [] },
      fields: [
        {
          key: 'items', label: 'Karty', type: 'list', itemLabel: 'Karta', minItems: 1, maxItems: 3,
          fields: [
            { key: 'title', label: 'Tytuł', type: 'text', required: true },
            { key: 'link', label: 'Link', type: 'link' },
            { key: 'note', label: 'Notatka', type: 'text', level: 'advanced' },
          ],
        },
        {
          key: 'style', label: 'Styl', type: 'group', level: 'advanced',
          fields: [{ key: 'color', label: 'Kolor', type: 'tokenColor', allowed: ['gold'] }],
        },
      ],
    }),
    footerNote: defineBlock({ type: 'footerNote', label: 'Stopka', region: 'footer', defaults: {}, fields: [{ key: 'text', label: 'Tekst', type: 'text' }] }),
  },
  globals: {
    site: {
      label: 'Strona',
      fields: [
        { key: 'phone', label: 'Telefon', type: 'text' },
        { key: 'analyticsId', label: 'GA', type: 'text', level: 'developer' },
      ],
    },
    nav: {
      label: 'Nawigacja',
      fields: [{ key: 'links', label: 'Linki', type: 'list', itemLabel: 'Link', fields: [{ key: 'link', label: 'Link', type: 'link' }] }],
    },
  },
  layouts: {
    home: { label: 'Główna', regions: ['hero', 'main', 'footer'] },
    doc: { label: 'Dokument', regions: ['main'] },
  },
  seoFields: [
    { key: 'title', label: 'Title', type: 'text', maxLength: 70 },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'canonical', label: 'Canonical', type: 'text' },
    { key: 'ogTitle', label: 'OG title', type: 'text' },
    { key: 'ogDescription', label: 'OG description', type: 'textarea' },
    { key: 'ogImage', label: 'OG image', type: 'text' },
    { key: 'noindex', label: 'Noindex', type: 'toggle', level: 'advanced' },
  ],
})

export const seo: SeoFields = { title: 'T', description: 'D', canonical: 'https://x.pl/', ogTitle: '', ogDescription: '', ogImage: '', noindex: false }

export function makePage(): PageDocument {
  return deepFreeze({
    title: 'Główna',
    slug: '',
    layout: 'home',
    seo: { ...seo },
    blocks: [
      { id: 'h1', type: 'hero', props: { title: 'Cześć', variant: 'dark' } },
      { id: 't1', type: 'text', props: { heading: 'A' } },
      { id: 'c1', type: 'cards', props: { items: [{ _id: 'i1', title: 'K1' }] } },
      { id: 't2', type: 'text', props: { heading: 'B' } },
      { id: 'f1', type: 'footerNote', props: { text: 'stopka' } },
    ],
  })
}
