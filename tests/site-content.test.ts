import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { personSchema, siteContent } from '../app/content/site'
import { workshop, workshopMailHref } from '../app/content/workshop'
import { workshopOfferPages } from '../app/content/workshop-offer'
import { currentProject, projectLabel, projects } from '../app/content/projects'

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
    expect(workshop.index).toBe(`01 / ${workshop.name}`)
    expect(workshop.path).toBe(`/${workshop.slug}`)
    expect(workshop.seo.url).toBe(`https://dobrolinski.pl${workshop.path}`)
    expect(workshop.program.topics).toHaveLength(5)
    expect(workshop.program.topics.map(topic => topic.number)).toEqual(['01', '02', '03', '04', '05'])
  })

  it('opens an email about the workshop with an encoded subject', () => {
    expect(workshopMailHref).toBe(
      `mailto:${siteContent.email}?subject=${encodeURIComponent('Warsztat POZNAJ CZŁOWIEKA')}`,
    )
  })
  it('lists both pages in the sitemap', () => {
    const sitemap = readFileSync(resolve(process.cwd(), 'public/sitemap.xml'), 'utf8')
    expect(sitemap).toContain('<loc>https://dobrolinski.pl/</loc>')
    expect(sitemap).toContain(`<loc>${workshop.seo.url}</loc>`)
  })
  it('keeps the product structure and the six-page offer layout', () => {
    expect(workshop.workshopParts.map(part => part.name)).toEqual([
      'CZŁOWIEK', 'SPRZEDAŻ', 'RELACJA', 'WASZA FIRMA',
    ])
    expect(workshop.process.steps.map(step => step.label)).toEqual(['PRZED', 'W TRAKCIE', 'PO'])
    expect(workshopOfferPages.map(page => page.page)).toEqual([1, 2, 3, 4, 5, 6])
    expect(workshop.regularPrice.amount).toBe(4900)
  })

  it('makes no numeric promises in outcomes', () => {
    const outcomes = workshop.outcomes.items.flat().join(' ')
    expect(outcomes).not.toMatch(/%|\d/)
  })

  it('never ships the pilot price in public source', () => {
    const dirs = ['app/content', 'app/components', 'app/pages']
    for (const dir of dirs) {
      for (const file of readdirSync(resolve(process.cwd(), dir))) {
        const source = readFileSync(resolve(process.cwd(), dir, file), 'utf8')
        expect(source, `${dir}/${file}`).not.toMatch(/2[\s\u00a0]?900/)
      }
    }
  })
  it('keeps visible copy free of em-dash pauses', () => {
    const { seo, ...visibleWorkshop } = workshop
    const visible = JSON.stringify([siteContent, visibleWorkshop])
    expect(seo.title).toBeTruthy()
    expect(visible).not.toContain('—')
  })
  it('ships the dedicated Open Graph image for the workshop', () => {
    expect(workshop.seo.image).toBe('https://dobrolinski.pl/og-poznaj-czlowieka.png')
    const png = readFileSync(resolve(process.cwd(), 'public/og-poznaj-czlowieka.png'))
    // Nagłówek IHDR: szerokość i wysokość jako 32-bit big-endian.
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630])
    expect(workshop.seo.socialTitle).not.toContain('—')
  })
  it('treats the workshop as the first project of a numbered series', () => {
    expect(projects[0]?.number).toBe('01')
    expect(projectLabel(currentProject)).toBe(workshop.index)
    expect(new Set(projects.map(project => project.number)).size).toBe(projects.length)
  })
})
