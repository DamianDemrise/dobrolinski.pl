/**
 * dobrolinski.pl: definicje bloków, globali, layoutów i pól SEO dla DEMRISE CMS.
 * Jeden typ bloku = jedna istniejąca sekcja strony. Kształt danych: types.ts.
 * Ten plik nie trafia do publicznego bundla (renderer używa tylko regions.ts).
 */
import { defineBlock } from '@demrise/cms-core'
import type { FieldDef, FieldLevel, SiteSchema } from '@demrise/cms-core'
import { blockRegions, layoutRegions } from './regions'
import type { BlockType } from './types'

interface Opts { level?: FieldLevel, inline?: boolean, required?: boolean, help?: string, maxLength?: number, tab?: FieldDef['tab'], format?: 'url' | 'links' }

const text = (key: string, label: string, o: Opts = {}): FieldDef => ({ key, label, type: 'text', inline: true, ...o })
const area = (key: string, label: string, o: Opts = {}): FieldDef => ({ key, label, type: 'textarea', inline: true, ...o })
const lines = (key: string, label: string, o: Omit<Opts, 'format'> & { maxItems?: number, format?: 'links' } = {}): FieldDef => ({ key, label, type: 'lines', inline: true, ...o })
const group = (key: string, label: string, fields: FieldDef[], o: Opts = {}): FieldDef => ({ key, label, type: 'group', fields, ...o })
const list = (key: string, label: string, itemLabel: string, fields: FieldDef[], o: Opts & { minItems?: number, maxItems?: number } = {}): FieldDef => ({
  key, label, type: 'list', itemLabel, fields, sortable: true, ...o,
})
const dev = (key: string, label: string, help?: string): FieldDef => ({ key, label, type: 'text', level: 'developer', help })

/** Bloki stałe: nie da się ich przesunąć, usunąć, ukryć ani powielić. */
const fixed = { movable: false, removable: false, hideable: false, duplicable: false }
/** Sekcje warsztatu: kolejność w obszarze 'main' do zmiany, bez powielania (stałe id nagłówków). */
const section = { movable: true, removable: true, hideable: true, duplicable: false }

const block = (type: BlockType, label: string, fields: FieldDef[], restrictions: Partial<typeof fixed>, maxPerPage = 1) =>
  defineBlock({ type, label, region: blockRegions[type], fields, defaults: {}, restrictions, maxPerPage })

const lineList = (key: string, label: string, itemLabel: string, o: Opts & { minItems?: number, maxItems?: number } = {}) =>
  list(key, label, itemLabel, [lines('lines', 'Linie')], o)

export const blocks = {
  'home-stage': block('home-stage', 'Strona główna: nazwisko, obszary i myśli', [
    dev('navLabel', 'Etykieta nawigacji obszarów (czytnik ekranu)'),
  ], fixed),

  'current-project': block('current-project', 'Aktualny projekt', [
    text('label', 'Etykieta', { maxLength: 40 }),
    area('lead', 'Opis', { maxLength: 200 }),
  ], { movable: true, removable: true, hideable: true, duplicable: false }),

  'contact-links': block('contact-links', 'Kontakt (e-mail i telefon)', [
    dev('trackPlace', 'Miejsce w pomiarze kliknięć', 'data-track-place'),
  ], { movable: true, removable: true, hideable: true, duplicable: false }),

  'site-footer': block('site-footer', 'Stopka: Powered by i polityka prywatności', [
    text('poweredLabel', 'Tekst przed marką'),
    text('poweredBrand', 'Marka'),
    { key: 'poweredHref', label: 'Adres marki', type: 'text', level: 'advanced', format: 'url' },
    text('newTabNote', 'Opis dla czytnika (nowa karta)', { level: 'advanced' }),
  ], fixed),

  'back-link': block('back-link', 'Przycisk powrotu', [
    text('label', 'Tekst', { maxLength: 30 }),
    { key: 'href', label: 'Adres', type: 'text', level: 'developer', format: 'url' },
    dev('trackPlace', 'Miejsce w pomiarze kliknięć', 'data-track-place'),
  ], fixed),

  'workshop-hero': block('workshop-hero', 'Warsztat: pierwszy ekran', [
    lines('titleLines', 'Tytuł (linie)', { required: true, maxItems: 3 }),
    area('lead', 'Lead'),
    lines('descriptionLines', 'Opis (linie)'),
    list('meta', 'Informacje', 'Informacja', [
      text('label', 'Etykieta'),
      lines('lines', 'Linie'),
    ], { maxItems: 4 }),
    text('cta', 'Przycisk rozmowy'),
    text('more', 'Przycisk „więcej”'),
    { key: 'image', label: 'Zdjęcie', type: 'image', level: 'advanced' },
  ], fixed),

  'workshop-manifest': block('workshop-manifest', 'Warsztat: manifest i bez skryptu', [
    text('quietLine', 'Linia cicha'),
    text('strongLine', 'Linia mocna'),
    lines('followLines', 'Rozwinięcie (linie)'),
    group('noScript', 'Bez skryptu', [
      text('title', 'Nagłówek'),
      lines('lines', 'Linie'),
      area('reason', 'Powód'),
      text('statement', 'Puenta'),
    ]),
  ], section),

  'workshop-program': block('workshop-program', 'Warsztat: o czym będziemy rozmawiać', [
    text('eyebrow', 'Nadtytuł'),
    list('topics', 'Tematy', 'Temat', [
      text('number', 'Numer', { level: 'advanced', maxLength: 4 }),
      lines('titleLines', 'Tytuł (linie)'),
      lines('textLines', 'Opis (linie)'),
    ], { minItems: 1 }),
  ], section),

  'workshop-beliefs': block('workshop-beliefs', 'Warsztat: kilka rzeczy, w które wierzę', [
    text('eyebrow', 'Nadtytuł'),
    list('items', 'Myśli', 'Myśl', [
      text('line', 'Pierwsza linia'),
      text('quiet', 'Druga linia (cicha)'),
    ], { minItems: 1 }),
  ], section),

  'workshop-parts': block('workshop-parts', 'Warsztat: cztery części i Wasze historie', [
    dev('ariaLabel', 'Etykieta listy części (czytnik ekranu)'),
    list('parts', 'Części', 'Część', [
      text('number', 'Numer', { level: 'advanced', maxLength: 4 }),
      text('name', 'Nazwa'),
      lines('lines', 'Linie'),
      text('closing', 'Zamknięcie (opcjonalnie)'),
    ], { minItems: 1 }),
    group('stories', 'Wasze historie', [
      text('quietLine', 'Linia cicha'),
      text('strongLine', 'Linia mocna'),
      text('caption', 'Podpis'),
      lineList('situations', 'Sytuacje', 'Sytuacja'),
    ]),
  ], section),

  'workshop-about': block('workshop-about', 'Warsztat: o mnie', [
    lines('titleLines', 'Tytuł (linie)'),
    lineList('paragraphs', 'Akapity', 'Akapit', { minItems: 1 }),
  ], section),

  'workshop-audience': block('workshop-audience', 'Warsztat: dla kogo', [
    text('eyebrow', 'Nadtytuł'),
    lines('titleLines', 'Tytuł (linie)'),
    lines('people', 'Kto (lista)'),
    lines('detailsLines', 'Szczegóły (linie)'),
  ], section),

  'workshop-process': block('workshop-process', 'Warsztat: współpraca, zasady i cena', [
    text('title', 'Nagłówek'),
    list('steps', 'Etapy', 'Etap', [
      text('label', 'Etykieta'),
      area('lead', 'Lead'),
      lines('lines', 'Linie'),
      area('note', 'Notatka (opcjonalnie)'),
    ], { minItems: 1 }),
    group('groundRules', 'Na tym warsztacie', [
      text('eyebrow', 'Nadtytuł'),
      lineList('items', 'Zasady', 'Zasada'),
    ]),
    text('priceIncludesLabel', 'Etykieta „W cenie”'),
  ], section),

  'workshop-closing': block('workshop-closing', 'Warsztat: finał, oferta e-mailem i epilog', [
    text('title', 'Nagłówek'),
    lines('paragraphs', 'Akapity'),
    text('cta', 'Przycisk rozmowy'),
    group('offer', 'Formularz oferty', [
      text('title', 'Nagłówek'),
      lines('lines', 'Opis (linie)'),
      text('label', 'Etykieta pola'),
      text('placeholder', 'Podpowiedź w polu', { level: 'advanced' }),
      text('submit', 'Przycisk'),
      text('sending', 'Przycisk w trakcie wysyłki'),
      group('note', 'Informacja o danych', [
        area('text', 'Tekst'),
        text('link', 'Link do polityki'),
      ]),
      group('success', 'Po wysłaniu', [
        text('title', 'Nagłówek'),
        text('text', 'Tekst'),
        text('hint', 'Podpowiedź'),
      ]),
      group('errors', 'Błędy', [
        text('empty', 'Puste pole'),
        text('invalid', 'Zły adres'),
        text('failed', 'Błąd wysyłki'),
        text('failedHint', 'Podpowiedź przy błędzie'),
      ]),
    ]),
    lines('epilogue', 'Epilog (linie)'),
  ], fixed),

  'privacy-document': block('privacy-document', 'Polityka prywatności', [
    text('title', 'Tytuł'),
    text('site', 'Serwis'),
    text('effectiveDateLabel', 'Etykieta daty'),
    text('effectiveDate', 'Data obowiązywania'),
    list('sections', 'Sekcje', 'Sekcja', [
      { key: 'anchor', label: 'Kotwica (#id)', type: 'text', level: 'developer' },
      text('title', 'Nagłówek'),
      list('blocks', 'Akapity i listy', 'Akapit', [
        {
          key: 'kind',
          label: 'Rodzaj',
          type: 'select',
          level: 'advanced',
          options: [{ value: 'text', label: 'Akapit' }, { value: 'list', label: 'Lista' }],
        },
        area('text', 'Tekst', { help: 'Link: [[adres|etykieta]]', format: 'links' }),
        lines('items', 'Punkty listy', { help: 'Link: [[adres|etykieta]]', format: 'links' }),
      ]),
    ]),
  ], fixed),

  'ebook-hero': block('ebook-hero', 'Ebook: tytuł i wstęp', [
    text('eyebrow', 'Nadtytuł', { maxLength: 40 }),
    lines('titleLines', 'Tytuł (linie)', { required: true, maxItems: 3, maxLength: 60 }),
    lines('leadLines', 'Wstęp (linie)', { maxItems: 8, maxLength: 240 }),
  ], fixed),

  'ebook-contents': block('ebook-contents', 'Ebook: spis', [
    text('eyebrow', 'Nadtytuł', { maxLength: 40 }),
    list('items', 'Rozdziały', 'Rozdział', [
      text('number', 'Numer', { level: 'advanced', maxLength: 4 }),
      text('title', 'Tytuł', { maxLength: 80 }),
    ], { minItems: 1, maxItems: 12 }),
  ], section),

  'ebook-form': block('ebook-form', 'Ebook: formularz wysyłki e-mailem', [
    text('title', 'Nagłówek', { maxLength: 80 }),
    lines('lines', 'Opis (linie)', { maxItems: 4, maxLength: 160 }),
    text('label', 'Etykieta pola', { maxLength: 40 }),
    text('placeholder', 'Podpowiedź w polu', { level: 'advanced', maxLength: 60 }),
    text('submit', 'Przycisk', { maxLength: 40 }),
    text('sending', 'Przycisk w trakcie wysyłki', { maxLength: 40 }),
    area('consent', 'Informacja o danych', { help: 'Link: [[adres|etykieta]]', format: 'links', maxLength: 400 }),
    group('success', 'Po wysłaniu', [
      text('title', 'Nagłówek', { maxLength: 60 }),
      text('text', 'Tekst', { maxLength: 160 }),
      text('hint', 'Podpowiedź', { maxLength: 160 }),
    ]),
    group('errors', 'Błędy', [
      text('empty', 'Puste pole', { maxLength: 120 }),
      text('invalid', 'Zły adres', { maxLength: 120 }),
      text('failed', 'Błąd wysyłki', { maxLength: 120 }),
      text('failedHint', 'Podpowiedź przy błędzie', { maxLength: 120 }),
    ]),
  ], fixed),
} satisfies Record<BlockType, ReturnType<typeof defineBlock>>

export const globals: SiteSchema['globals'] = {
  site: {
    label: 'Ustawienia strony',
    fields: [
      text('name', 'Imię i nazwisko', { required: true }),
      { key: 'url', label: 'Adres strony', type: 'text', level: 'developer', format: 'url' },
      text('email', 'E-mail', { required: true }),
      text('phoneDisplay', 'Telefon (wyświetlany)'),
      { key: 'phoneHref', label: 'Telefon (link tel:)', type: 'text', level: 'advanced', format: 'url' },
      { key: 'telephone', label: 'Telefon (dane strukturalne, +48…)', type: 'text', level: 'advanced' },
      list('areas', 'Obszary', 'Obszar', [
        text('label', 'Nazwa'),
        { key: 'slug', label: 'Identyfikator', type: 'text', level: 'developer' },
        text('thought', 'Myśl obszaru'),
      ], { minItems: 4, maxItems: 4 }),
      lines('thoughts', 'Myśli marki (rotacja na głównej)', { help: 'Pierwsza to myśl przewodnia.' }),
      group('consent', 'Baner zgody', [
        text('label', 'Etykieta regionu', { level: 'advanced' }),
        area('text', 'Tekst'),
        text('accept', 'Przycisk zgody'),
        text('reject', 'Przycisk odmowy'),
        text('reopen', 'Przycisk ponownego otwarcia'),
      ]),
      group('legal', 'Polityka prywatności (link)', [
        text('privacyLabel', 'Etykieta linku'),
        { key: 'privacyHref', label: 'Adres', type: 'text', level: 'developer', format: 'url' },
      ]),
    ],
  },
  workshop: {
    label: 'Warsztat POZNAJ CZŁOWIEKA (dane produktu)',
    fields: [
      text('number', 'Numer projektu', { level: 'advanced' }),
      text('name', 'Nazwa'),
      { key: 'path', label: 'Adres strony', type: 'text', level: 'developer', format: 'url' },
      text('mailSubject', 'Temat wiadomości e-mail'),
      text('title', 'Myśl przewodnia (oferta PDF)'),
      text('subtitle', 'Podtytuł (oferta PDF)'),
      group('format', 'Format', [
        text('duration', 'Czas'),
        text('audience', 'Dla kogo'),
        text('type', 'Forma'),
        text('group', 'Grupa'),
      ]),
      group('regularPrice', 'Cena regularna', [
        { key: 'amount', label: 'Kwota', type: 'number', min: 0, level: 'advanced' },
        { key: 'currency', label: 'Waluta', type: 'text', level: 'developer' },
        { key: 'net', label: 'Netto', type: 'toggle', level: 'advanced' },
        text('label', 'Cena (wyświetlana)'),
      ], { help: 'Ceny pilotażowej nie wpisujemy: repozytorium jest publiczne.' }),
      lines('priceIncludes', 'W cenie'),
      group('outcomes', 'Efekty (tylko oferta PDF)', [
        text('intro', 'Wstęp'),
        lineList('items', 'Efekty', 'Efekt'),
        text('conclusion', 'Zakończenie'),
      ]),
    ],
  },
}

export const layouts: SiteSchema['layouts'] = {
  home: { label: 'Strona główna', regions: [...layoutRegions.home] },
  workshop: { label: 'Projekt (warsztat)', regions: [...layoutRegions.workshop] },
  document: { label: 'Dokument', regions: [...layoutRegions.document] },
  ebook: { label: 'Ebook', regions: [...layoutRegions.ebook] },
}

export const seoFields: FieldDef[] = [
  { key: 'title', label: 'Tytuł strony (title)', type: 'text', tab: 'seo', required: true, maxLength: 70 },
  { key: 'description', label: 'Opis (meta description)', type: 'textarea', tab: 'seo', maxLength: 200 },
  { key: 'canonical', label: 'Adres kanoniczny', type: 'text', tab: 'seo', level: 'advanced', format: 'url' },
  { key: 'ogTitle', label: 'Tytuł w podglądzie linku', type: 'text', tab: 'seo' },
  { key: 'ogDescription', label: 'Opis w podglądzie linku', type: 'textarea', tab: 'seo' },
  { key: 'ogImage', label: 'Obraz podglądu (1200×630, adres https://)', type: 'text', tab: 'seo', level: 'advanced', format: 'url' },
  { key: 'ogImageAlt', label: 'Opis obrazu podglądu', type: 'text', tab: 'seo' },
  { key: 'noindex', label: 'Ukryj przed wyszukiwarkami', type: 'toggle', tab: 'seo', level: 'advanced' },
]

export const siteSchema: SiteSchema = {
  blocks,
  globals,
  layouts,
  seoFields,
}
