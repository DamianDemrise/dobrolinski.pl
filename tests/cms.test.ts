import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { resolveBlocks, validateEntityData, validatePage } from '@demrise/cms-core'
import type { PageDocument, PublishedSite } from '@demrise/cms-core'
import { describe, expect, it } from 'vitest'
import { createApp, createSSRApp, defineComponent, h, nextTick, provide, ref, withDirectives } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { layoutRegions } from '../cms/regions'
import { isUnpublishedRoute, publicRoutes, sitemapRoutes, sitemapXml } from '../cms/routes'
import { siteSchema } from '../cms/schema'
import CmsBlocks from '../vendor/demrise-cms/runtime/CmsBlocks'
import { CMS_BLOCK_SCOPE, CMS_EDIT_CONTEXT } from '../vendor/demrise-cms/runtime/context'
import type { CmsEditContext } from '../vendor/demrise-cms/runtime/context'
import { vCms } from '../vendor/demrise-cms/runtime/directive'
import { blockRegistry, regionOf } from '../app/cms/registry'
import { seoHead } from '../vendor/demrise-cms/runtime/seo'
import { tokensCssFromFiles } from '../scripts/cms-tokens.mjs'
import { localizeMedia, stableJson, validateSite } from '../scripts/cms-pull.mjs'
import published from '../content/published.json'
import ebookDraft from '../cms-worker/drafts/na-koncu-jest-czlowiek.json'

const site = published as unknown as PublishedSite
const root = (p: string) => resolve(process.cwd(), p)
const SLUGS = ['', 'poznaj-czlowieka', 'polityka-prywatnosci']

const renderRegion = (page: PageDocument, region: string, edit?: CmsEditContext) => {
  const app = createSSRApp({
    setup() {
      if (edit) provide(CMS_EDIT_CONTEXT, edit)
      return () => h(CmsBlocks, { page, region })
    },
  })
  return renderToString(app)
}

describe('CMS: content/published.json', () => {
  it('contains exactly the three pages of the site', () => {
    expect(Object.keys(site.pages).sort()).toEqual([...SLUGS].sort())
  })

  it('validates every entity against the site schema (core validators)', () => {
    for (const [slug, page] of Object.entries(site.pages)) {
      expect(validatePage(page, siteSchema), `page "${slug}"`).toEqual([])
      expect(validateEntityData('page', page, siteSchema, { slug }), `page "${slug}"`).toEqual([])
    }
    for (const [slug, data] of Object.entries(site.globals)) {
      expect(validateEntityData('global', data, siteSchema, { slug }), `global "${slug}"`).toEqual([])
    }
    for (const [slug, data] of Object.entries(site.components)) {
      expect(validateEntityData('component', data, siteSchema, { slug }), `component "${slug}"`).toEqual([])
    }
    expect(validateEntityData('tokens', site.tokens, siteSchema, { slug: 'tokens' })).toEqual([])
    expect(Object.keys(site.globals).sort()).toEqual(Object.keys(siteSchema.globals).sort())
  })

  it('passes the shape check of cms-pull and is stored in its stable format', () => {
    expect(validateSite(site)).toEqual([])
    expect(stableJson(site)).toBe(readFileSync(root('content/published.json'), 'utf8'))
  })

  it('keeps the hero and the closing fixed and the workshop sections reorderable', () => {
    const { blocks } = siteSchema
    expect(blocks['workshop-hero']!.restrictions).toMatchObject({ movable: false, removable: false })
    expect(blocks['workshop-closing']!.restrictions).toMatchObject({ movable: false, removable: false })
    expect(blocks['workshop-program']!.restrictions.movable).toBe(true)
    expect(blocks['workshop-program']!.region).toBe('main')
  })
})

describe('CMS: block registry and renderer', () => {
  it('registers a component for every block type in the schema, with the same region', () => {
    expect(Object.keys(blockRegistry).sort()).toEqual(Object.keys(siteSchema.blocks).sort())
    for (const [type, def] of Object.entries(siteSchema.blocks)) {
      expect(regionOf(type), type).toBe(def.region)
      const usedIn = Object.values(siteSchema.layouts).some(layout => layout.regions.includes(def.region))
      expect(usedIn, `${type}: region ${def.region} w żadnym layoucie`).toBe(true)
    }
    for (const component of Object.values(site.components)) {
      expect(Object.hasOwn(blockRegistry, component.blockType)).toBe(true)
    }
  })

  it('renders every block of every page document in a region of its layout', async () => {
    for (const slug of SLUGS) {
      const page = site.pages[slug]!
      const regions = layoutRegions[page.layout as keyof typeof layoutRegions]
      expect(regions, `layout ${page.layout}`).toBeTruthy()
      const resolved = resolveBlocks(page.blocks, site.components)
      let rendered = 0
      for (const region of regions) {
        const html = await renderRegion(page, region)
        const count = html.split('block-stub').length - 1
        expect(count, `${slug || 'home'} / ${region}`).toBe(resolved.filter(b => regionOf(b.type) === region && !b.hidden).length)
        rendered += count
      }
      expect(rendered, `${slug || 'home'}: każdy blok w obszarze layoutu`).toBe(page.blocks.length)
    }
  })

  it('skips hidden blocks and adds visibility classes only when set', async () => {
    const page = structuredClone(site.pages['poznaj-czlowieka']!)
    page.blocks.find(b => b.type === 'workshop-program')!.hidden = true
    page.blocks.find(b => b.type === 'workshop-about')!.visibility = { desktop: true, mobile: false }
    const html = await renderRegion(page, 'main')
    expect(html.split('block-stub').length - 1).toBe(7)
    expect(html).toContain('class="block-stub cms-hide-mobile"')
    expect(html.match(/cms-hide/g)).toHaveLength(1)

    const plain = await renderRegion(site.pages['poznaj-czlowieka']!, 'main')
    expect(plain).not.toContain('cms-hide')
    expect(plain).not.toContain('data-cms')
  })

  it('renders hidden blocks in the editor only when it asks for them', async () => {
    const page = structuredClone(site.pages['poznaj-czlowieka']!)
    page.blocks.find(b => b.type === 'workshop-program')!.hidden = true
    const edit: CmsEditContext = { page: ref(page), site: ref(site), showHidden: ref(true) }
    const html = await renderRegion(page, 'main', edit)
    expect(html.split('block-stub').length - 1).toBe(8)
  })

  it('produces the same head tags as before the CMS', () => {
    const workshop = seoHead(site.pages['poznaj-czlowieka']!.seo, 'website')
    expect(workshop.title).toBe('Poznaj Człowieka | Damian Dobroliński')
    expect(workshop.link).toEqual([{ rel: 'canonical', href: 'https://dobrolinski.pl/poznaj-czlowieka' }])
    expect(workshop.meta).toContainEqual({ property: 'og:image:alt', content: expect.stringContaining('POZNAJ CZŁOWIEKA') })
    const privacy = seoHead(site.pages['polityka-prywatnosci']!.seo, 'website')
    expect(privacy.meta.map(m => 'name' in m ? m.name : m.property)).toEqual(['description', 'og:type', 'og:title', 'og:description', 'og:url'])
  })
})

describe('CMS: v-cms directive', () => {
  const Field = defineComponent({
    setup: () => () => withDirectives(h('p', { class: 'lead' }, 'tekst'), [[vCms, 'lead']]),
  })
  const GlobalField = defineComponent({
    setup: () => () => withDirectives(h('a', 'mail'), [[vCms, 'globals.site.email']]),
  })
  const tree = (edit: CmsEditContext | null, child = Field) => ({
    setup() {
      if (edit) provide(CMS_EDIT_CONTEXT, edit)
      provide(CMS_BLOCK_SCOPE, { id: 'hero', type: 'workshop-hero', globalRef: undefined })
      return () => h(child)
    },
  })
  const edit = (): CmsEditContext => ({ page: ref(site.pages['poznaj-czlowieka']!), site: ref(site) })

  it('renders no attributes in public mode (SSR and client)', async () => {
    expect(await renderToString(createSSRApp(tree(null)))).toBe('<p class="lead">tekst</p>')
    const el = document.createElement('div')
    createApp(tree(null)).mount(el)
    await nextTick()
    expect(el.innerHTML).toBe('<p class="lead">tekst</p>')
  })

  it('marks block and global fields when an edit context is provided', async () => {
    const html = await renderToString(createSSRApp(tree(edit())))
    expect(html).toContain('data-cms-block="hero"')
    expect(html).toContain('data-cms-field="lead"')

    const el = document.createElement('div')
    createApp(tree(edit(), GlobalField)).mount(el)
    await nextTick()
    const a = el.querySelector('a')!
    expect(a.getAttribute('data-cms-global')).toBe('site')
    expect(a.getAttribute('data-cms-field')).toBe('email')
    expect(a.hasAttribute('data-cms-block')).toBe(false)
  })
})

describe('CMS: tokens', () => {
  it('keeps app/assets/css/tokens.css in sync with the tokens (regenerating changes nothing)', () => {
    expect(tokensCssFromFiles()).toBe(readFileSync(root('app/assets/css/tokens.css'), 'utf8'))
  })

  it('defines each token variable only in tokens.css', () => {
    const map = JSON.parse(readFileSync(root('cms/tokens-css.json'), 'utf8')) as { rules: { vars: [string, string, string][] }[] }
    const vars = [...new Set(map.rules.flatMap(rule => rule.vars.map(v => v[2])))]
    for (const file of readdirSync(root('app/assets/css')).filter(f => f !== 'tokens.css')) {
      const css = readFileSync(root(`app/assets/css/${file}`), 'utf8')
      for (const name of vars) expect(css, `${file}: ${name}`).not.toMatch(new RegExp(`${name}\\s*:`))
    }
  })

  it('carries the brand colors and the real typography scale', () => {
    expect(site.tokens.colors.base!.value).toBe('#080808')
    expect(site.tokens.colors.paper!.value).toBe('#f7f7f5')
    expect(site.tokens.typography['display-xl']!.value).toBe('clamp(2.8rem, 7vw, 7.4rem)')
    expect(site.tokens.breakpoints.mobile!.value).toBe('640px')
  })
})

describe('CMS: cms-pull', () => {
  it('rewrites CMS media to local paths and leaves other images alone', () => {
    const found = new Map<string, string>()
    const a = 'med_0123456789abcdef0123'
    const c = 'med_fedcba9876543210fedc'
    const out = localizeMedia({ a: { src: `https://dobrolinski-cms.demrise.workers.dev/media/${a}/foto.webp` }, b: '/workshop/poznaj-czlowieka.webp', c: [`/media/${c}/y.png`] }, found)
    expect(out).toEqual({ a: { src: `/media/${a}/foto.webp` }, b: '/workshop/poznaj-czlowieka.webp', c: [`/media/${c}/y.png`] })
    expect([...found.keys()]).toEqual([`/media/${a}/foto.webp`, `/media/${c}/y.png`])
    // Obcy host, id spoza formatu Workera i nie-obrazy zostają nietknięte i nie są pobierane.
    expect(localizeMedia(`https://evil.example/media/${a}/x.png`)).toBe(`https://evil.example/media/${a}/x.png`)
    expect(localizeMedia('/media/x1/y.png')).toBe('/media/x1/y.png')
    expect(localizeMedia(`/media/${a}/pwn.html`)).toBe(`/media/${a}/pwn.html`)
    expect(localizeMedia('/media/../../etc/passwd')).toBe('/media/../../etc/passwd')
  })

  it('rejects a site with a blocked phrase or missing pages', () => {
    const blocked = 'Fraza Zakazana 123'
    expect(validateSite(site, [blocked])).toEqual([])
    const withPhrase = structuredClone(site)
    ;(withPhrase.globals.workshop as { title: string }).title = 'Tytuł frazazakazana\u00a0123'
    expect(validateSite(withPhrase, [blocked])).toContain('treść zawiera frazę zablokowaną (CMS_BLOCKED_TEXT)')
    expect(validateSite(withPhrase, [])).toEqual([])
    const missing = structuredClone(site)
    delete (missing.pages as Record<string, unknown>)['polityka-prywatnosci']
    expect(validateSite(missing).join()).toContain('polityka-prywatnosci')
  })
})

describe('CMS: ebook „Na końcu jest człowiek” (szkic, nieopublikowany)', () => {
  const draft = ebookDraft as unknown as PageDocument

  it('passes core validation as a page entity with the published components', () => {
    expect(validatePage(draft, siteSchema, site.components)).toEqual([])
    expect(validateEntityData('page', draft, siteSchema, { slug: 'na-koncu-jest-czlowiek', components: site.components })).toEqual([])
    expect(draft.layout).toBe('ebook')
    expect(draft.seo.canonical).toBe('https://dobrolinski.pl/na-koncu-jest-czlowiek')
  })

  it('renders every block in a region of the ebook layout', async () => {
    let rendered = 0
    for (const region of layoutRegions.ebook) {
      const html = await renderRegion(draft, region)
      rendered += html.split('block-stub').length - 1
    }
    expect(rendered).toBe(draft.blocks.length)
  })

  it('is not published: no prerender route and the sitemap stays as before', () => {
    expect(Object.hasOwn(site.pages, 'na-koncu-jest-czlowiek')).toBe(false)
    expect(publicRoutes(site)).toEqual(['/', '/poznaj-czlowieka', '/polityka-prywatnosci'])
    expect(isUnpublishedRoute(site, '/na-koncu-jest-czlowiek')).toBe(true)
    expect(sitemapXml(sitemapRoutes(site))).toBe(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://dobrolinski.pl/</loc>
  </url>
  <url>
    <loc>https://dobrolinski.pl/poznaj-czlowieka</loc>
  </url>
  <url>
    <loc>https://dobrolinski.pl/polityka-prywatnosci</loc>
  </url>
</urlset>
`)
  })

  it('gets a prerender route and a sitemap entry once published', () => {
    const withEbook = { ...site, pages: { ...site.pages, 'na-koncu-jest-czlowiek': draft } }
    expect(publicRoutes(withEbook)).toEqual(['/', '/poznaj-czlowieka', '/polityka-prywatnosci', '/na-koncu-jest-czlowiek'])
    expect(isUnpublishedRoute(withEbook, '/na-koncu-jest-czlowiek')).toBe(false)
    expect(sitemapXml(sitemapRoutes(withEbook))).toContain('<loc>https://dobrolinski.pl/na-koncu-jest-czlowiek</loc>')
  })
})

describe('CMS: trasy stron dodanych w panelu (catch-all)', () => {
  const page = (slug: string, noindex = false): PageDocument => ({ ...site.pages['polityka-prywatnosci']!, slug, seo: { ...site.pages['polityka-prywatnosci']!.seo, noindex } })
  const withPages = { ...site, pages: { ...site.pages, zeta: page('zeta'), alfa: page('alfa'), ukryta: page('ukryta', true) } }

  it('every published page gets a prerender route, after the fixed ones, sorted by slug', () => {
    expect(publicRoutes(withPages)).toEqual(['/', '/poznaj-czlowieka', '/polityka-prywatnosci', '/alfa', '/ukryta', '/zeta'])
  })

  it('the sitemap lists published pages without the noindex ones', () => {
    expect(sitemapRoutes(withPages)).toEqual(['/', '/poznaj-czlowieka', '/polityka-prywatnosci', '/alfa', '/zeta'])
    const xml = sitemapXml(sitemapRoutes(withPages))
    expect(xml).toContain('<loc>https://dobrolinski.pl/alfa</loc>')
    expect(xml).not.toContain('ukryta')
  })

  it('prerender skips crawled links to unpublished pages, keeps files and published pages', () => {
    for (const path of ['/nieznana', '/nieznana/', '/a/b', '/nieznana?x=1']) expect(isUnpublishedRoute(withPages, path), path).toBe(true)
    for (const path of ['/', '/alfa', '/alfa/', '/alfa#x', '/poznaj-czlowieka', '/sitemap.xml', '/200.html', '/_nuxt/x.js', '/og-home.png']) {
      expect(isUnpublishedRoute(withPages, path), path).toBe(false)
    }
  })

  it('the catch-all page renders a single published slug and 404s otherwise', () => {
    const source = readFileSync(root('app/pages/[...slug].vue'), 'utf8')
    expect(source).toContain('parts.length === 1')
    expect(source).toContain('hasPublishedPage(slug)')
    expect(source).toContain('statusCode: 404')
    expect(readdirSync(root('app/pages')).filter(f => f.endsWith('.vue')).sort()).toEqual(['[...slug].vue', 'index.vue', 'polityka-prywatnosci.vue', 'poznaj-czlowieka.vue'])
  })
})
