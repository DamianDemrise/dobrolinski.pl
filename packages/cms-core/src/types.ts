/**
 * DEMRISE CMS core: kontrakt typów. Bez zależności od frameworka i od konkretnej strony.
 * Zmiana tego pliku = zmiana kontraktu między rdzeniem, Workerem, Nuxtem i edytorem.
 */

export type Device = 'desktop' | 'tablet' | 'mobile'
export const DEVICES: readonly Device[] = ['desktop', 'tablet', 'mobile'] as const

/** Wartość responsywna: desktop zawsze, tablet i mobile tylko jako nadpisania (dziedziczą w dół). */
export interface Responsive<T> {
  desktop: T
  tablet?: T
  mobile?: T
}

/** Poziom pola: kto może je zmieniać (SAFE MODE / ADVANCED MODE / DEVELOPER MODE). */
export type FieldLevel = 'safe' | 'advanced' | 'developer'

export type FieldType =
  | 'text' // jedna linia
  | 'textarea' // kilka linii, bez HTML
  | 'lines' // string[]: każdy element to osobna linia w składzie
  | 'link' // LinkValue
  | 'image' // ImageValue
  | 'select' // jedna z opcji (warianty)
  | 'toggle' // boolean
  | 'number'
  | 'tokenColor' // nazwa tokenu koloru, nigdy HEX
  | 'list' // powtarzalne elementy z własnymi polami
  | 'group' // grupa pól (obiekt)

interface FieldBase {
  key: string
  label: string
  type: FieldType
  /** Domyślnie 'safe'. */
  level?: FieldLevel
  help?: string
  required?: boolean
  /** Pole edytowalne bezpośrednio na canvasie (klik w tekst). */
  inline?: boolean
  /** Wartość może mieć nadpisania tablet/mobile. */
  responsive?: boolean
  /** Pole należy do zakładki SEO/ADVANCED zamiast TREŚĆ. */
  tab?: 'content' | 'appearance' | 'responsive' | 'seo'
}

export interface TextField extends FieldBase {
  type: 'text' | 'textarea'
  maxLength?: number
  /** 'url': wartość to adres (pusta albo bezpieczna wg isSafeUrl); 'links': tekst z linkami [[adres|etykieta]]. */
  format?: 'url' | 'links'
}
export interface LinesField extends FieldBase {
  type: 'lines'
  maxItems?: number
  maxLength?: number
  /** 'links': każda linia może zawierać [[adres|etykieta]]; adresy sprawdzane isSafeUrl. */
  format?: 'links'
}
export interface LinkField extends FieldBase { type: 'link' }
export interface ImageField extends FieldBase { type: 'image' }
export interface SelectField extends FieldBase { type: 'select', options: { value: string, label: string }[] }
export interface ToggleField extends FieldBase { type: 'toggle' }
export interface NumberField extends FieldBase { type: 'number', min?: number, max?: number }
export interface TokenColorField extends FieldBase { type: 'tokenColor', allowed: string[] }
export interface ListField extends FieldBase {
  type: 'list'
  itemLabel: string
  fields: FieldDef[]
  minItems?: number
  maxItems?: number
  sortable?: boolean
}
export interface GroupField extends FieldBase { type: 'group', fields: FieldDef[] }

export type FieldDef =
  | TextField | LinesField | LinkField | ImageField | SelectField | ToggleField
  | NumberField | TokenColorField | ListField | GroupField

export interface LinkValue { label: string, href: string }
export interface ImageValue {
  /** Id w bibliotece mediów; brak = zasób statyczny z repo. */
  mediaId?: string
  src: string
  alt: string
  width?: number
  height?: number
}

export type Props = Record<string, unknown>

export interface BlockRestrictions {
  movable: boolean
  removable: boolean
  hideable: boolean
  duplicable: boolean
}

export interface BlockDefinition {
  type: string
  label: string
  /** Obszar layoutu, w którym blok może stać (np. 'hero', 'main'). */
  region: string
  fields: FieldDef[]
  defaults: Props
  restrictions: BlockRestrictions
  /** Ile razy na stronie (brak = bez limitu). */
  maxPerPage?: number
}

export interface BlockInstance {
  id: string
  type: string
  props: Props
  hidden?: boolean
  /** Widoczność per urządzenie (dziedziczenie desktop → tablet → mobile). Brak = widoczny wszędzie. */
  visibility?: Responsive<boolean>
  /** Instancja komponentu globalnego: type === 'global', ref = id encji component. */
  ref?: string
  /** Dla instancji globalnej: nadpisania tylko pól z `exposed`. */
  overrides?: Props
}

export interface SeoFields {
  title: string
  description: string
  canonical: string
  ogTitle: string
  ogDescription: string
  ogImage: string
  noindex: boolean
}

export interface PageDocument {
  title: string
  slug: string
  /** Nazwa layoutu w aplikacji (np. 'home', 'workshop', 'document'). */
  layout: string
  seo: SeoFields
  blocks: BlockInstance[]
}

export interface ComponentDocument {
  name: string
  blockType: string
  props: Props
  /** Pola, które instancja może nadpisać. */
  exposed: string[]
}

export interface PatternDocument {
  name: string
  blocks: BlockInstance[]
}

export interface TokenValue { value: string, label: string }
export interface TokensDocument {
  colors: Record<string, TokenValue>
  typography: Record<string, TokenValue>
  spacing: Record<string, TokenValue>
  widths: Record<string, TokenValue>
  radius: Record<string, TokenValue>
  /** Tylko informacyjnie i dla podglądu responsywnego (CSS media queries nie czytają zmiennych). */
  breakpoints: Record<string, TokenValue>
}

/** Treść globalna (np. ustawienia strony): dowolny obiekt opisany definicją pól. */
export type GlobalDocument = Props

export type EntityKind = 'page' | 'global' | 'component' | 'pattern' | 'tokens'

export interface EntityDataMap {
  page: PageDocument
  global: GlobalDocument
  component: ComponentDocument
  pattern: PatternDocument
  tokens: TokensDocument
}

export type EntityStatus = 'published' | 'draft' | 'changed'

export interface Entity<K extends EntityKind = EntityKind> {
  id: string
  kind: K
  /** Strona: slug URL ('' = strona główna); global: klucz; component/pattern/tokens: identyfikator. */
  slug: string
  title: string
  draft: EntityDataMap[K]
  draftRev: number
  published: EntityDataMap[K] | null
  publishedAt: string | null
  publishedBy: string | null
  updatedAt: string
  updatedBy: string | null
}

export type RevisionKind = 'checkpoint' | 'publish' | 'restore' | 'import'

export interface Revision {
  id: string
  entityId: string
  version: number
  kind: RevisionKind
  data: unknown
  createdAt: string
  createdBy: string | null
}

/** Snapshot opublikowanej treści: wejście buildu publicznej strony (content/published.json). */
export interface PublishedSite {
  generatedAt: string
  pages: Record<string, PageDocument>
  globals: Record<string, GlobalDocument>
  components: Record<string, ComponentDocument>
  tokens: TokensDocument
}

/** Definicje konkretnej strony (cms/): bloki, globale, tokeny domyślne. */
export interface SiteSchema {
  blocks: Record<string, BlockDefinition>
  globals: Record<string, { label: string, fields: FieldDef[] }>
  /** `starter`: typy bloków nowej pustej strony w tym układzie (panel „Nowa strona”), w kolejności. */
  layouts: Record<string, { label: string, regions: string[], starter?: string[] }>
  seoFields: FieldDef[]
}

export interface ValidationIssue {
  path: string
  message: string
}

export interface MediaItem {
  id: string
  filename: string
  mime: string
  size: number
  width: number | null
  height: number | null
  alt: string
  createdAt: string
  createdBy: string | null
  url: string
}
