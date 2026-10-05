import { describe, expect, it } from 'vitest'
import { personSchema, siteContent } from '../app/content/site'

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
})
