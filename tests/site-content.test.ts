import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { personSchema, siteContent } from '../app/content/site'
import { workshop, workshopMailHref } from '../app/content/workshop'

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
})
