/**
 * Publiczne trasy strony: prerender (nuxt.config) i sitemap.xml (server/routes).
 * Strony stałe są zawsze; strony dodane w panelu dopiero, gdy są opublikowane
 * (są w content/published.json). Czysty TS, bez frameworka.
 */
export const SITE_ORIGIN = 'https://dobrolinski.pl'

/** Kolejność jak w sitemap.xml sprzed CMS. */
const FIXED_ROUTES = ['/', '/poznaj-czlowieka', '/polityka-prywatnosci']

/** Strony publiczne tylko po publikacji w panelu (slug). */
export const PUBLISH_GATED_SLUGS = ['na-koncu-jest-czlowiek']

export function publicRoutes(site: { pages: Record<string, unknown> }): string[] {
  const gated = PUBLISH_GATED_SLUGS.filter(slug => Object.hasOwn(site.pages, slug)).map(slug => `/${slug}`)
  return [...FIXED_ROUTES, ...gated]
}

/** Strony jeszcze nieopublikowane: Nuxt sam dopisuje statyczne strony do prerenderu, więc je pomijamy. */
export function unpublishedRoutes(site: { pages: Record<string, unknown> }): string[] {
  return PUBLISH_GATED_SLUGS.filter(slug => !Object.hasOwn(site.pages, slug)).map(slug => `/${slug}`)
}

export function sitemapXml(routes: string[]): string {
  const urls = routes.map(route => `  <url>\n    <loc>${SITE_ORIGIN}${route}</loc>\n  </url>\n`).join('')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}</urlset>\n`
}
