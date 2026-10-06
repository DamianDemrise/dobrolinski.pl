/**
 * Strony dodawane w panelu: adres (slug) i domyślne SEO. Jedno źródło dla Workera
 * (POST /api/entities) i panelu (dialog „Nowa strona”). Czysty TS, bez frameworka.
 */
import { SITE_ORIGIN } from './routes'

/** Jeden segment adresu: małe litery, cyfry, pojedyncze myślniki między nimi. */
export const PAGE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const PAGE_SLUG_MAX = 64

/**
 * Adresy zajęte przez panel, API, pliki buildu i katalog public/ (tests/pages.test.ts pilnuje,
 * że każdy wpis z public/ jest na liście). `index`: index.html to strona główna.
 */
export const RESERVED_PAGE_SLUGS: readonly string[] = [
  'admin', 'api', 'media', '_nuxt', '200', '404', 'index', 'home',
  'sitemap.xml', 'robots.txt', 'favicon.svg', 'CNAME', 'cname',
  'oferta', 'workshop', 'og-home.png', 'og-poznaj-czlowieka.png',
]

export type PageSlugProblem = 'empty' | 'too_long' | 'format' | 'reserved'

export function pageSlugProblem(slug: string): PageSlugProblem | null {
  if (slug === '') return 'empty'
  if (slug.length > PAGE_SLUG_MAX) return 'too_long'
  if (!PAGE_SLUG_RE.test(slug)) return 'format'
  if (RESERVED_PAGE_SLUGS.includes(slug)) return 'reserved'
  return null
}

export const SEO_TITLE_SUFFIX = ' | Damian Dobroliński'
const SEO_TITLE_MAX = 70

/** SEO nowej strony: tytuł z dopiskiem marki (w limicie 70 znaków), kanoniczny adres, pusty opis (panel SEO go oznaczy). */
export function newPageSeo(title: string, slug: string) {
  const base = title.trim()
  const withSuffix = `${base}${SEO_TITLE_SUFFIX}`
  return {
    title: withSuffix.length <= SEO_TITLE_MAX ? withSuffix : base.slice(0, SEO_TITLE_MAX).trim(),
    description: '',
    canonical: `${SITE_ORIGIN}/${slug}`,
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
    noindex: false,
  }
}
