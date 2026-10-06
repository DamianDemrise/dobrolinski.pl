// @vitest-environment node
/**
 * Agent G (adversarial): wartości, które przechodzą walidację i trafiają do href/src/CSS/plików.
 * Testy FAILUJĄCE = potwierdzona podatność (oczekują bezpiecznego zachowania).
 */
import { describe, expect, it } from 'vitest'
import { getAtPath, isSafeUrl, setAtPath, tokensToCss, validateEntityData } from '../../src/index'
import { isSafeTokenValue } from '../../src/tokens'
import { siteSchema } from '../../../../cms/schema'
import { linkSegments, personSchema } from '../../../../cms/derive'
// @ts-expect-error moduł .mjs bez typów
import { localizeMedia } from '../../../../scripts/cms-pull.mjs'

const JS = [
  'javascript:alert(1)',
  'JaVaScRiPt:alert(1)',
  'javascript&colon;alert(1)',
  'java\tscript:alert(1)',
  ' javascript:alert(1)',
  'data:text/html,<script>alert(1)</script>',
  'vbscript:x',
]

describe('[blokowane] isSafeUrl: warianty javascript:/data:/protocol-relative', () => {
  for (const href of [...JS, '//evil.example', '/\\evil.example', '\\\\evil.example', 'https:evil.example', '\u0000javascript:x', 'ｊavascript:x', 'http://']) {
    it(JSON.stringify(href), () => expect(isSafeUrl(href)).toBe(false))
  }
})

describe('linki w polityce prywatności [[adres|etykieta]] (pole safe, content_editor)', () => {
  for (const href of JS.filter(h => !h.includes('\t') && !h.startsWith(' '))) {
    it(`linkSegments nie emituje niebezpiecznego href: ${href}`, () => {
      const parts = linkSegments(`Zobacz [[${href}|tutaj]].`)
      for (const part of parts) if (typeof part !== 'string') expect(isSafeUrl(part.href)).toBe(true)
    })
  }

  it('walidacja strony odrzuca [[javascript:...|x]] w tekście akapitu', () => {
    const doc = {
      title: 'Polityka', slug: 'polityka-prywatnosci', layout: 'document',
      seo: { title: 'P' },
      blocks: [{ id: 'p1', type: 'privacy-document', props: { sections: [{ _id: 's1', title: 'S', blocks: [{ _id: 'b1', kind: 'text', text: 'Kliknij [[javascript:alert(document.domain)|tutaj]]' }] }] } }],
    }
    const issues = validateEntityData('page', doc, siteSchema, { slug: 'polityka-prywatnosci' })
    expect(issues.some(i => i.path.includes('text'))).toBe(true)
  })
})

describe('pola typu text używane jako href w prawdziwym schemacie', () => {
  it('site-footer.poweredHref (advanced, renderowane jako <a :href>) odrzuca javascript:', () => {
    const doc = {
      title: 'G', slug: '', layout: 'home', seo: { title: 'G' },
      blocks: [{ id: 'f', type: 'site-footer', props: { poweredHref: 'javascript:alert(document.domain)' } }],
    }
    const issues = validateEntityData('page', doc, siteSchema, { slug: '' })
    expect(issues.some(i => i.path.endsWith('poweredHref'))).toBe(true)
  })

  it('global site.phoneHref (advanced, <a :href>) odrzuca javascript:', () => {
    const issues = validateEntityData('global', { name: 'D', email: 'a@b.pl', phoneHref: 'javascript:alert(1)' }, siteSchema, { slug: 'site' })
    expect(issues.some(i => i.path === 'phoneHref')).toBe(true)
  })
})

describe('cms-pull: media pobierane do public/ w czasie buildu', () => {
  it('nie pobiera plików z obcego hosta', () => {
    const found = new Map<string, string>()
    localizeMedia({ text: 'https://evil.example/media/x/pwn.png' }, found)
    for (const url of found.values()) expect(new URL(url).host).toBe('dobrolinski-cms.demrise.workers.dev')
  })

  it('zapisuje tylko rozszerzenia obrazów (nie .html/.svg/.js)', () => {
    const found = new Map<string, string>()
    localizeMedia({ a: '/media/med_00000000000000000000/pwn.html', b: '/media/med_00000000000000000000/x.svg' }, found)
    for (const local of found.keys()) expect(local).toMatch(/\.(png|jpe?g|webp|avif|gif)$/)
  })

  it('[blokowane] brak path traversal przez id/nazwę', () => {
    const found = new Map<string, string>()
    localizeMedia({ a: '/media/../../x.png', b: '/media/a/../../x.png', c: '/media/..%2f/x.png', d: '/media/a/.htaccess' }, found)
    expect([...found.keys()]).toEqual([])
  })
})

describe('[blokowane] tokeny CSS i prototype pollution', () => {
  it('wartości wychodzące poza deklarację odrzucone', () => {
    for (const v of ['red;} body{display:none', 'red</style><script>', 'red/* x', 'a\\3b', 'x\ny', '}']) expect(isSafeTokenValue(v)).toBe(false)
    const css = tokensToCss({ colors: { 'x': { value: 'red;}*{x:y' }, '__proto__': { value: 'red' } }, typography: {}, spacing: {}, widths: {}, radius: {}, breakpoints: {} } as never)
    expect(css).not.toContain('}*{')
  })

  it('setAtPath/getAtPath blokują __proto__/constructor', () => {
    expect(() => setAtPath({}, '__proto__.polluted', 1)).toThrow()
    expect(() => setAtPath({}, 'a.constructor.prototype.polluted', 1)).toThrow()
    expect(() => getAtPath({}, '__proto__')).toThrow()
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  it('JSON z kluczem __proto__ w props bloku odrzucony walidacją', () => {
    const doc = JSON.parse('{"title":"G","slug":"","layout":"home","seo":{"title":"G"},"blocks":[{"id":"c","type":"current-project","props":{"__proto__":{"x":1}}}]}')
    expect(validateEntityData('page', doc, siteSchema, { slug: '' }).length).toBeGreaterThan(0)
  })
})

describe('[blokowane] JSON-LD: </script> w globalu nie wychodzi ze skryptu', () => {
  it('unhead escapuje < w script type=application/ld+json', async () => {
    const { createHead, renderSSRHead } = await import('unhead/server')
    const head = createHead()
    const site = { name: '</script><script>alert(1)</script><!--', url: 'https://x', email: 'a@b', telephone: '1', areas: [] } as never
    head.push({ script: [{ type: 'application/ld+json', textContent: JSON.stringify(personSchema(site)) }] })
    const out = await renderSSRHead(head)
    const html = Object.values(out).join('\n')
    expect(html).not.toContain('</script><script>alert(1)')
    expect(html).not.toContain('<!--')
  })
})
