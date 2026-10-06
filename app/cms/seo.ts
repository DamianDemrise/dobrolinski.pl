/**
 * Pola SEO dokumentu strony → tagi <head>. Czysty TS: używa go nuxt.config (strona główna
 * jako app.head, więc też 404/200) i strony (useHead). Te same tagi co przed CMS.
 */
import type { SeoFields } from '@demrise/cms-core'
import type { SeoExtra } from '../../cms/types'

export type HeadMeta = { name: string, content: string } | { property: string, content: string }

/** Obraz OG ma stały format 1200×630 (sprawdza test). */
const OG_IMAGE_SIZE = { width: '1200', height: '630' }

const imageType = (src: string) => (/\.png$/i.test(src) ? 'image/png' : /\.jpe?g$/i.test(src) ? 'image/jpeg' : /\.webp$/i.test(src) ? 'image/webp' : '')

export function seoMeta(seo: SeoFields & SeoExtra, ogType: string): HeadMeta[] {
  const meta: HeadMeta[] = []
  if (seo.description) meta.push({ name: 'description', content: seo.description })
  if (seo.noindex) meta.push({ name: 'robots', content: 'noindex' })
  meta.push({ property: 'og:type', content: ogType })
  if (seo.ogTitle) meta.push({ property: 'og:title', content: seo.ogTitle })
  if (seo.ogDescription) meta.push({ property: 'og:description', content: seo.ogDescription })
  if (seo.canonical) meta.push({ property: 'og:url', content: seo.canonical })
  if (seo.ogImage) {
    meta.push({ property: 'og:image', content: seo.ogImage })
    const type = imageType(seo.ogImage)
    if (type) meta.push({ property: 'og:image:type', content: type })
    meta.push({ property: 'og:image:width', content: OG_IMAGE_SIZE.width })
    meta.push({ property: 'og:image:height', content: OG_IMAGE_SIZE.height })
    if (seo.ogImageAlt) meta.push({ property: 'og:image:alt', content: seo.ogImageAlt })
    meta.push({ name: 'twitter:card', content: 'summary_large_image' })
    if (seo.ogTitle) meta.push({ name: 'twitter:title', content: seo.ogTitle })
    if (seo.ogDescription) meta.push({ name: 'twitter:description', content: seo.ogDescription })
    meta.push({ name: 'twitter:image', content: seo.ogImage })
    if (seo.ogImageAlt) meta.push({ name: 'twitter:image:alt', content: seo.ogImageAlt })
  }
  return meta
}

export function seoHead(seo: SeoFields & SeoExtra, ogType: string) {
  return {
    title: seo.title,
    meta: seoMeta(seo, ogType),
    link: seo.canonical ? [{ rel: 'canonical' as const, href: seo.canonical }] : [],
  }
}
