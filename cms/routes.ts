/**
 * Publiczne trasy strony: prerender (nuxt.config) i sitemap.xml (server/routes).
 * Strony stałe są zawsze; strony dodane w panelu dopiero, gdy są opublikowane
 * (są w content/published.json), i renderuje je app/pages/[...slug].vue. Czysty TS, bez frameworka.
 */
export const SITE_ORIGIN = 'https://dobrolinski.pl'

/** Strony z własnym plikiem w app/pages, w kolejności jak w sitemap.xml sprzed CMS. */
const FIXED_SLUGS = ['', 'poznaj-czlowieka', 'polityka-prywatnosci']

/** Minimum dokumentu strony potrzebne trasom (bez zależności od rdzenia). */
interface RoutedSite { pages: Record<string, { seo?: { noindex?: boolean } } | undefined> }

/** Stałe trasy, potem opublikowane strony z panelu alfabetycznie (stabilna kolejność). */
export function publicRoutes(site: RoutedSite): string[] {
  const added = Object.keys(site.pages).filter(slug => !FIXED_SLUGS.includes(slug)).sort()
  return [...FIXED_SLUGS, ...added].map(slug => `/${slug}`)
}

/** Trasy do sitemap.xml: publiczne bez stron z `seo.noindex`. */
export function sitemapRoutes(site: RoutedSite): string[] {
  return publicRoutes(site).filter(route => site.pages[route.slice(1)]?.seo?.noindex !== true)
}

/**
 * Prerender: czy pominąć adres znaleziony przez crawlLinks. Pomijamy adresy stron (bez rozszerzenia),
 * których nie ma wśród publicznych tras: catch-all dałby dla nich 404 i wywrócił build.
 */
export function isUnpublishedRoute(site: RoutedSite, path: string): boolean {
  const clean = path.replace(/[?#].*$/, '')
  const last = clean.split('/').pop() ?? ''
  if (clean.startsWith('/_') || last.includes('.')) return false
  const route = clean.length > 1 ? clean.replace(/\/+$/, '') : clean
  return !publicRoutes(site).includes(route)
}

export function sitemapXml(routes: string[]): string {
  const urls = routes.map(route => `  <url>\n    <loc>${SITE_ORIGIN}${route}</loc>\n  </url>\n`).join('')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}</urlset>\n`
}
