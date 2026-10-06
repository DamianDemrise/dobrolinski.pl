# @demrise/cms-core: kontrakt funkcji

Typy: `src/types.ts`, uprawnienia: `src/permissions.ts`, HTTP: `src/api.ts`.
Wszystko eksportowane z `src/index.ts`. Importy wewnątrz pakietu bez rozszerzeń (`./types`).
Funkcje są czyste i niemutujące: zwracają nowy obiekt, nie zmieniają wejścia.

## Pola i walidacja (`src/fields.ts`)

```ts
defineBlock(def: BlockDefinition): BlockDefinition            // pomocnik dla cms/, uzupełnia restrictions domyślne
isSafeUrl(href: string): boolean                               // http(s)://, mailto:, tel:, /ścieżka, #kotwica; NIE javascript:, data:, vbscript:
validateFields(fields: FieldDef[], value: Props, path?: string): ValidationIssue[]
validateBlock(def: BlockDefinition, props: Props, path?: string): ValidationIssue[]
validatePage(doc: PageDocument, schema: SiteSchema): ValidationIssue[]        // typy bloków istnieją, region dozwolony dla layoutu, maxPerPage, unikalne id, props wg definicji, seo wg schema.seoFields
validateEntityData(kind: EntityKind, data: unknown, schema: SiteSchema, ctx: { slug: string }): ValidationIssue[]
getFieldAtPath(fields: FieldDef[], path: string): FieldDef | undefined         // 'items.2.title' → pole 'title' w liście 'items'
getAtPath(obj: unknown, path: string): unknown
setAtPath<T>(obj: T, path: string, value: unknown): T                          // niemutujące
```

Zasady walidacji: tekst bez znaków sterujących (poza \n w textarea), `maxLength`, `required`; `link.href` przez `isSafeUrl`; `image.src` musi być ścieżką względną `/…` albo `https://`; `select` tylko z opcji; `tokenColor` tylko z `allowed`; `list` respektuje `minItems/maxItems`, każdy element listy ma string `_id`. Żadne pole nie przyjmuje HTML (tekst renderowany jest jako tekst, Vue escapuje). Nieznane klucze w props są błędem.

## Operacje na dokumencie strony (`src/document.ts`)

```ts
newId(prefix?: string): string                                  // krótki losowy id (crypto.getRandomValues)
findBlock(doc: PageDocument, blockId: string): BlockInstance | undefined
updateBlockProps(doc, blockId, path: string, value: unknown): PageDocument
moveBlock(doc, blockId, toIndex: number, schema: SiteSchema): PageDocument     // rzuca CmsError, gdy !movable albo zmienia region
setBlockHidden(doc, blockId, hidden: boolean, schema): PageDocument             // rzuca, gdy !hideable
setBlockVisibility(doc, blockId, device: Device, visible: boolean | undefined): PageDocument
duplicateBlock(doc, blockId, schema): PageDocument                              // rzuca, gdy !duplicable lub maxPerPage
removeBlock(doc, blockId, schema): PageDocument                                 // rzuca, gdy !removable
insertBlock(doc, block: BlockInstance, index: number, schema): PageDocument
insertPattern(doc, pattern: PatternDocument, index: number): PageDocument       // kopie z nowymi id (także _id w listach)
class CmsError extends Error { code: string }
```

## Rozwiązywanie (`src/resolve.ts`)

```ts
resolveBlock(block: BlockInstance, components: Record<string, ComponentDocument>): { id, type, props, hidden, visibility, globalRef?: string }
   // type 'global': type = component.blockType, props = component.props + overrides tylko dla kluczy z exposed
resolveBlocks(blocks, components): ReturnType<typeof resolveBlock>[]
resolveResponsive<T>(value: Responsive<T> | T, device: Device): T              // mobile → tablet → desktop
setResponsive<T>(value: Responsive<T> | T | undefined, device: Device, next: T | undefined): Responsive<T>  // nie tworzy nadpisania równego wartości odziedziczonej
visibilityClasses(visibility?: Responsive<boolean>): string[]                    // np. ['cms-hide-mobile']; [] gdy brak ograniczeń
```

## Uprawnienia na poziomie zmian (`src/changes.ts`)

```ts
requiredPermissions(kind: EntityKind, before: unknown, after: unknown, schema: SiteSchema): Permission[]
```
Porównuje stare i nowe dane encji i zwraca uprawnienia potrzebne do takiej zmiany:
- `page`: zmiana dowolnego `props` lub struktury bloków → `CONTENT_EDIT`; pole `level: 'advanced'` → `MODE_ADVANCED`; `level: 'developer'` → `MODE_DEVELOPER`; pola z `tab: 'seo'` i `seo` strony → `SEO_EDIT`; zmiana `slug`/`layout` → `MODE_DEVELOPER`.
- `global` → `CONTENT_EDIT` (+ poziomy pól), `tokens` → `DESIGN_EDIT`, `component` → `COMPONENT_EDIT`, `pattern` → `COMPONENT_EDIT`.

## Rewizje i diff (`src/diff.ts`)

```ts
diffValues(before: unknown, after: unknown, path?: string): { path: string, before: unknown, after: unknown }[]   // różnice liści, tablice po indeksie
stableStringify(value: unknown): string                                           // klucze posortowane
```

## Tokeny (`src/tokens.ts`)

```ts
tokensToCss(tokens: TokensDocument, selector?: string): string                    // --color-<name>, --type-<name>, --space-<name>, --width-<name>, --radius-<name>
colorTokenVar(name: string): string                                               // 'var(--color-<name>)'
```

## Snapshot publikacji (`src/published.ts`)

```ts
buildPublishedSite(entities: Entity[], now?: Date): PublishedSite                // tylko `published` (nie draft); encje bez published pomijane
pageDocumentForSlug(site: PublishedSite, slug: string): PageDocument | undefined
```
