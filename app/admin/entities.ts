/**
 * Czyste pomocniki dla ekranów encji (treści globalne, komponenty, wzorce, tokeny, media):
 * walidacja slugu, status wersji, adresy edycji i liczenie użyć komponentów globalnych.
 * Bez Vue i bez API (tests/admin/entities.test.ts).
 */
import type { BlockInstance, Entity, EntityKind, EntityStatus, PageDocument } from '@demrise/cms-core'
import { deepEqual } from '@demrise/cms-core'

/** Ten sam wzorzec co POST /api/entities w Workerze. */
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/

export function slugError(slug: string): string | null {
  if (!slug) return 'Podaj identyfikator'
  if (!SLUG_RE.test(slug)) return 'Tylko małe litery a–z, cyfry i myślnik; na początku litera lub cyfra; do 64 znaków'
  return null
}

/** Propozycja slugu z nazwy (bez polskich znaków). */
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'l')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/, '')
}

/** Status jak w API (rows.ts entityStatus), liczony lokalnie z bieżących danych. */
export function localStatus(data: unknown, published: unknown): EntityStatus {
  if (published === null || published === undefined) return 'draft'
  return deepEqual(data, published) ? 'published' : 'changed'
}

/** Ekran edycji encji danego rodzaju. */
export function entityEditPath(kind: EntityKind | undefined, id: string): string {
  const q = encodeURIComponent(id)
  switch (kind) {
    case 'page':
      return `/admin/edit/${q}`
    case 'global':
      return `/admin/content?id=${q}`
    case 'component':
    case 'pattern':
      return `/admin/components?id=${q}`
    case 'tokens':
      return '/admin/design'
    default:
      return `/admin/edit/${q}`
  }
}

export interface ComponentUsage {
  /** Strony (id, tytuł), na których stoi instancja (wersja robocza albo opublikowana). */
  pages: { id: string, title: string }[]
  /** Liczba instancji (wszystkie wystąpienia w obu wersjach, bez podwójnego liczenia tego samego bloku). */
  instances: number
}

type PageLike = Pick<Entity, 'id' | 'title' | 'draft' | 'published'>

const blocksOf = (doc: unknown): BlockInstance[] => {
  const blocks = (doc as PageDocument | null)?.blocks
  return Array.isArray(blocks) ? blocks : []
}

/**
 * Użycia komponentów globalnych na stronach: instancja `{ type: 'global', ref }` wskazuje
 * komponent po id albo po slugu (jak componentUsages w Workerze), w drafcie lub w wersji opublikowanej.
 */
export function countComponentUsages(
  components: { id: string, slug: string }[],
  pages: PageLike[],
): Record<string, ComponentUsage> {
  const out: Record<string, ComponentUsage> = {}
  for (const component of components) {
    const usage: ComponentUsage = { pages: [], instances: 0 }
    for (const page of pages) {
      const ids = new Set<string>()
      for (const doc of [page.draft, page.published]) {
        for (const block of blocksOf(doc)) {
          if (block?.type === 'global' && (block.ref === component.id || block.ref === component.slug)) ids.add(block.id)
        }
      }
      if (ids.size) {
        usage.pages.push({ id: page.id, title: page.title })
        usage.instances += ids.size
      }
    }
    out[component.id] = usage
  }
  return out
}

/** Klucze najwyższego poziomu, które instancja może nadpisać (tylko istniejące pola definicji). */
export function cleanExposed(exposed: string[], fieldKeys: string[]): string[] {
  return fieldKeys.filter(key => exposed.includes(key))
}
