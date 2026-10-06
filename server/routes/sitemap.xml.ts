/**
 * sitemap.xml z opublikowanych stron (prerender przy `nuxt generate`).
 * Strona dodana w panelu trafia tu dopiero po publikacji (cms/routes.ts).
 */
import { publicRoutes, sitemapXml } from '../../cms/routes'
import published from '../../content/published.json'

export default defineEventHandler((event) => {
  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  return sitemapXml(publicRoutes(published))
})
