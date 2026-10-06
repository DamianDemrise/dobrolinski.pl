import { readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { personSchema, publishedContent, siteContent } from '../app/content/site'
import { workshop, workshopBlock, workshopIndex, workshopMailHref, workshopPage } from '../app/content/workshop'
import { workshopOfferPages } from '../app/content/workshop-offer'
import { privacy, privacyPage } from '../app/content/privacy'
import { currentProject, projectLabel, projects } from '../app/content/projects'
import { isMeasuredHost } from '../app/composables/useAnalyticsConsent'
import { blockedPhrases, squashText } from '../scripts/cms-pull.mjs'
import { publicRoutes, sitemapXml } from '../cms/routes'

describe('site content', () => {
  it('keeps the requested thought as the default', () => {
    expect(siteContent.thoughts[0]).toBe('Na końcu każdej sprzedaży jest człowiek.')
  })

  it('provides unique interactive areas with dedicated thoughts', () => {
    const slugs = siteContent.areas.map(area => area.slug)

    expect(new Set(slugs).size).toBe(siteContent.areas.length)
    expect(siteContent.areas.every(area => area.thought.length > 20)).toBe(true)
  })

  it('publishes consistent Person structured data', () => {
    expect(personSchema['@type']).toBe('Person')
    expect(personSchema.name).toBe(siteContent.name)
    expect(personSchema.url).toBe('https://dobrolinski.pl/')
    expect(personSchema.knowsAbout).toEqual(siteContent.areas.map(area => area.label))
  })
  it('describes analytics consent with both choices', () => {
    const { consent } = siteContent
    expect(consent.accept).not.toBe(consent.reject)
    expect(consent.text).toMatch(/Google Analytics/)
  })

  it('presents the workshop as a numbered project with a short program teaser', () => {
    expect(workshopIndex).toBe(`01 / ${workshop.name}`)
    expect(workshop.path).toBe(`/${workshopPage.slug}`)
    expect(workshopPage.seo.canonical).toBe(`https://dobrolinski.pl${workshop.path}`)
    const { topics } = workshopBlock('workshop-program')
    expect(topics).toHaveLength(5)
    expect(topics.map(topic => topic.number)).toEqual(['01', '02', '03', '04', '05'])
  })

  it('opens an email about the workshop with an encoded subject', () => {
    expect(workshopMailHref).toBe(
      `mailto:${siteContent.email}?subject=${encodeURIComponent('Warsztat POZNAJ CZŁOWIEKA')}`,
    )
  })
  it('lists both pages in the sitemap', () => {
    // sitemap.xml generuje server/routes/sitemap.xml.ts z opublikowanych stron.
    const sitemap = sitemapXml(publicRoutes(publishedContent))
    expect(sitemap).toContain('<loc>https://dobrolinski.pl/</loc>')
    expect(sitemap).toContain(`<loc>${workshopPage.seo.canonical}</loc>`)
    expect(sitemap).toContain(`<loc>${privacyPage.seo.canonical}</loc>`)
  })
  it('keeps the product structure and the six-page offer layout', () => {
    expect(workshopBlock('workshop-parts').parts.map(part => part.name)).toEqual([
      'CZŁOWIEK', 'SPRZEDAŻ', 'RELACJA', 'WASZA FIRMA',
    ])
    expect(workshopBlock('workshop-process').steps.map(step => step.label)).toEqual(['PRZED', 'W TRAKCIE', 'PO'])
    expect(workshopOfferPages.map(page => page.page)).toEqual([1, 2, 3, 4, 5, 6])
    expect(workshop.regularPrice.amount).toBe(4900)
  })

  it('makes no numeric promises in outcomes', () => {
    const outcomes = workshop.outcomes.items.flatMap(item => item.lines).join(' ')
    expect(outcomes).not.toMatch(/%|\d/)
  })

  // Zablokowane frazy (np. cena pilotażowa) tylko z sekretu CMS_BLOCKED_TEXT: repo jest publiczne.
  it.skipIf(!blockedPhrases().length)('never ships blocked phrases in public source', () => {
    const blocked = blockedPhrases().map(squashText)
    const dirs = ['app/content', 'app/components', 'app/pages', 'app/cms', 'cms', 'content', 'shared', 'offer-worker/src']
    for (const dir of dirs) {
      for (const file of readdirSync(resolve(process.cwd(), dir))) {
        if (!statSync(resolve(process.cwd(), dir, file)).isFile()) continue
        const source = readFileSync(resolve(process.cwd(), dir, file), 'utf8')
        const text = squashText(source)
        expect(blocked.filter(phrase => text.includes(phrase)), `${dir}/${file}`).toEqual([])
      }
    }
  })
  it('keeps the privacy policy honest about the stack', () => {
    const text = JSON.stringify(privacy.sections)
    expect(text).toContain('Demrise sp. z o.o.')
    expect(text).toContain('0001157533')
    expect(text).toContain('biuro@demrise.pl')
    expect(text).toContain('Resend')
    expect(text).not.toMatch(/CookieYes|DO UZUPEŁNIENIA|G-3HLJLPBZJM|GTM-TR8MDG8W/)
    expect(text).not.toMatch(/DOBROLINSKI\.PL/)
  })

  it('serves the offer PDF at a stable public URL', () => {
    const pdf = readFileSync(resolve(process.cwd(), 'public/oferta/poznaj-czlowieka.pdf'))
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
    // Pod /poznaj-czlowieka/ nie może powstać katalog: przesłoniłby poznaj-czlowieka.html na GitHub Pages.
    expect(() => readdirSync(resolve(process.cwd(), 'public/poznaj-czlowieka'))).toThrow()
  })

  it('keeps visible copy free of em-dash pauses', () => {
    // Cała opublikowana treść; SEO strony głównej (opis z półpauzą) i warsztatu poza zakresem, jak wcześniej.
    const { seo } = workshopPage
    const pages = Object.entries(publishedContent.pages)
      .map(([slug, { seo: pageSeo, ...page }]) => (slug === '' || slug === workshopPage.slug ? page : { ...page, seo: pageSeo }))
    const visible = JSON.stringify([publishedContent.globals, publishedContent.components, pages])
    expect(seo.title).toBeTruthy()
    expect(visible).toContain(siteContent.name)
    expect(visible).toContain(privacy.title)
    expect(visible).not.toContain('—')
    for (const file of readdirSync(resolve(process.cwd(), 'cms'))) {
      expect(readFileSync(resolve(process.cwd(), 'cms', file), 'utf8'), `cms/${file}`).not.toContain('—')
    }
  })
  it('ships the dedicated Open Graph image for the workshop', () => {
    expect(workshopPage.seo.ogImage).toBe('https://dobrolinski.pl/og-poznaj-czlowieka.png')
    const png = readFileSync(resolve(process.cwd(), 'public/og-poznaj-czlowieka.png'))
    // Nagłówek IHDR: szerokość i wysokość jako 32-bit big-endian.
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630])
    expect(workshopPage.seo.ogTitle).not.toContain('—')
  })
  it('treats the workshop as the first project of a numbered series', () => {
    expect(projects[0]?.number).toBe('01')
    expect(projectLabel(currentProject)).toBe(workshopIndex)
    expect(new Set(projects.map(project => project.number)).size).toBe(projects.length)
  })
  it('ships the homepage Open Graph image at 1200x630', () => {
    const png = readFileSync(resolve(process.cwd(), 'public/og-home.png'))
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630])
  })
})

describe('pomiar tylko z produkcji', () => {
  it('GA4 nie zbiera danych z localhost ani z podglądów buildu', () => {
    for (const host of ['dobrolinski.pl', 'www.dobrolinski.pl', 'DOBROLINSKI.PL']) expect(isMeasuredHost(host), host).toBe(true)
    for (const host of ['localhost', '127.0.0.1', 'damiandemrise.github.io', 'dobrolinski.pl.evil.com', 'preview.dobrolinski.pl']) {
      expect(isMeasuredHost(host), host).toBe(false)
    }
  })
})
