/**
 * sitemap.xml z opublikowanych stron (prerender przy `nuxt generate`).
 * Strona dodana w panelu trafia tu dopiero po publikacji; strony z `seo.noindex` są pomijane (cms/routes.ts).
 */
import { sitemapRoutes, sitemapXml } from '../../cms/routes'
import published from '../../content/published.json'

export default defineEventHandler((event) => {
  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  return sitemapXml(sitemapRoutes(published))
})
