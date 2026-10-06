/** Adresy stron dodawanych w panelu (cms/pages.ts): zarezerwowane nazwy i format. */
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { newPageSeo, pageSlugProblem, RESERVED_PAGE_SLUGS } from '../cms/pages'

describe('adresy nowych stron', () => {
  it('każdy wpis z public/ jest zarezerwowany (strona nie przesłoni pliku ani katalogu)', () => {
    const entries = readdirSync(resolve(process.cwd(), 'public')).filter(name => name !== '.DS_Store')
    for (const name of entries) expect(RESERVED_PAGE_SLUGS, name).toContain(name)
  })

  it('jeden segment, małe litery i cyfry z pojedynczymi myślnikami, do 64 znaków', () => {
    for (const ok of ['a', 'nowa-strona', 'oferta-2026', 'a'.repeat(64)]) expect(pageSlugProblem(ok), ok).toBeNull()
    expect(pageSlugProblem('')).toBe('empty')
    expect(pageSlugProblem('a'.repeat(65))).toBe('too_long')
    for (const bad of ['a/b', 'Nowa', 'a--b', '-a', 'a-', 'ą', 'a b', 'a.html']) expect(pageSlugProblem(bad), bad).toBe('format')
    for (const reserved of ['admin', 'api', 'media', 'oferta', 'workshop', '200', '404', 'index']) expect(pageSlugProblem(reserved)).toBe('reserved')
  })

  it('domyślne SEO: tytuł z marką, kanoniczny adres, pusty opis', () => {
    expect(newPageSeo(' Kontakt ', 'kontakt')).toEqual({
      title: 'Kontakt | Damian Dobroliński',
      description: '',
      canonical: 'https://dobrolinski.pl/kontakt',
      ogTitle: '',
      ogDescription: '',
      ogImage: '',
      noindex: false,
    })
  })
})
