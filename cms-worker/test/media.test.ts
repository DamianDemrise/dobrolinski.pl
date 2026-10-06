// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { MediaItem, PageDocument } from '../../packages/cms-core/src/index'
import { sanitizeFilename, sniffImage } from '../src/image'
import { body, homePage, ORIGIN, setup, type Harness } from './support/harness'

const u8 = (...parts: (number[] | string)[]) => new Uint8Array(parts.flatMap(p => typeof p === 'string' ? [...p].map(c => c.charCodeAt(0)) : p))
const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]
const le16 = (n: number) => [n & 255, (n >> 8) & 255]
const le24 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255]

export const images = {
  png: (w = 640, h = 480) => u8([0x89], 'PNG', [0x0D, 0x0A, 0x1A, 0x0A], be32(13), 'IHDR', be32(w), be32(h), [8, 6, 0, 0, 0], [0, 0, 0, 0]),
  jpeg: () => u8([0xFF, 0xD8, 0xFF, 0xE0], [0, 16], 'JFIF', [0, 1, 1, 0, 0, 1, 0, 1, 0, 0], [0xFF, 0xC0, 0, 17, 8], [0x01, 0x2C], [0x01, 0x90], [3], new Array(9).fill(0), [0xFF, 0xD9]),
  gif: () => u8('GIF89a', le16(32), le16(16), [0, 0, 0], [0x3B]),
  webp: () => u8('RIFF', [30, 0, 0, 0], 'WEBP', 'VP8X', [10, 0, 0, 0], [0, 0, 0, 0], le24(1919), le24(1079)),
  webpLossless: () => u8('RIFF', [30, 0, 0, 0], 'WEBP', 'VP8L', [10, 0, 0, 0], [0x2F], (() => {
    const bits = (99) | (49 << 14)
    return [bits & 255, (bits >>> 8) & 255, (bits >>> 16) & 255, (bits >>> 24) & 255]
  })(), [0, 0, 0, 0, 0]),
  avif: () => u8(be32(20), 'ftyp', 'avif', [0, 0, 0, 0], 'mif1', be32(20), 'ispe', [0, 0, 0, 0], be32(800), be32(600)),
}

describe('rozpoznanie obrazu i nazwy plików', () => {
  it('typ i wymiary z nagłówka', () => {
    const buf = (b: Uint8Array) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer
    expect(sniffImage(buf(images.png()))).toEqual({ mime: 'image/png', width: 640, height: 480 })
    expect(sniffImage(buf(images.jpeg()))).toEqual({ mime: 'image/jpeg', width: 400, height: 300 })
    expect(sniffImage(buf(images.gif()))).toEqual({ mime: 'image/gif', width: 32, height: 16 })
    expect(sniffImage(buf(images.webp()))).toEqual({ mime: 'image/webp', width: 1920, height: 1080 })
    expect(sniffImage(buf(images.webpLossless()))).toEqual({ mime: 'image/webp', width: 100, height: 50 })
    expect(sniffImage(buf(images.avif()))).toEqual({ mime: 'image/avif', width: 800, height: 600 })
    expect(sniffImage(buf(u8('<svg xmlns="http://www.w3.org/2000/svg"></svg>')))).toBeNull()
    expect(sniffImage(buf(u8('<?xml version="1.0"?><svg/>')))).toBeNull()
  })

  it('sanityzacja nazwy', () => {
    expect(sanitizeFilename('../../etc/passwd', 'image/png')).toBe('passwd.png')
    expect(sanitizeFilename('C:\\Users\\x\\Zdjęcie Łódź (1).JPG', 'image/jpeg')).toBe('zdjecie-lodz-1.jpg')
    expect(sanitizeFilename('..', 'image/gif')).toBe('image.gif')
    expect(sanitizeFilename(`${'a'.repeat(200)}.png`, 'image/png')).toHaveLength(80)
    expect(sanitizeFilename('photo.svg', 'image/png')).toBe('photo.png')
  })
})

async function upload(h: Harness, cookie: string, bytes: Uint8Array, name: string, type = 'image/png', path = '/api/media', alt?: string) {
  const form = new FormData()
  form.set('file', new File([bytes as BlobPart], name, { type }))
  if (alt !== undefined) form.set('alt', alt)
  return h.api('POST', path, { cookie, raw: form })
}

describe('biblioteka mediów', () => {
  it('upload, publiczny odczyt z nagłówkami, lista', async () => {
    const h = setup()
    const cookie = await h.login('content_editor')
    const res = await upload(h, cookie, images.png(), 'Moje Zdjęcie.png', 'image/png', '/api/media', 'Opis')
    expect(res.status).toBe(201)
    const item = await body<MediaItem>(res)
    expect(item).toMatchObject({ filename: 'moje-zdjecie.png', mime: 'image/png', width: 640, height: 480, alt: 'Opis' })
    expect(item.url).toBe(`/media/${item.id}/moje-zdjecie.png`)
    expect(h.media.store.has(`media:${item.id}`)).toBe(true)

    const file = await h.app.fetch(new Request(`${ORIGIN}${item.url}`), h.env)
    expect(file.status).toBe(200)
    expect(file.headers.get('Content-Type')).toBe('image/png')
    expect(file.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(file.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable')
    expect(file.headers.get('Content-Disposition')).toBe('inline; filename="moje-zdjecie.png"')
    const etag = file.headers.get('ETag')!
    expect(etag).toMatch(/^".+"$/)
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(images.png())
    const cached = await h.app.fetch(new Request(`${ORIGIN}${item.url}`, { headers: { 'If-None-Match': etag } }), h.env)
    expect(cached.status).toBe(304)

    const list = await body<{ items: MediaItem[] }>(await h.api('GET', '/api/media', { cookie }))
    expect(list.items.map(i => i.id)).toEqual([item.id])
    expect((await h.app.fetch(new Request(`${ORIGIN}/media/med_00000000000000000000/x.png`), h.env)).status).toBe(404)
  })

  it('SVG odrzucone, fałszywe rozszerzenie rozpoznane po bajtach, za duży plik 413', async () => {
    const h = setup()
    const cookie = await h.login('editor')
    const svg = await upload(h, cookie, u8('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), 'logo.svg', 'image/svg+xml')
    expect(svg.status).toBe(415)
    const fakePng = await upload(h, cookie, u8('<html><script>alert(1)</script></html>'), 'photo.png', 'image/png')
    expect(fakePng.status).toBe(415)
    const realGifNamedPng = await upload(h, cookie, images.gif(), 'animacja.png', 'image/png')
    expect(realGifNamedPng.status).toBe(201)
    expect(await body(realGifNamedPng)).toMatchObject({ mime: 'image/gif', filename: 'animacja.gif' })
    const big = new Uint8Array(5 * 1024 * 1024 + 1)
    big.set(images.png())
    expect((await upload(h, cookie, big, 'big.png')).status).toBe(413)
    const noFile = await h.api('POST', '/api/media', { cookie, raw: new FormData() })
    expect(noFile.status).toBe(400)
  })

  it('nazwa z path traversal jest oczyszczona', async () => {
    const h = setup()
    const cookie = await h.login('editor')
    const item = await body<MediaItem>(await upload(h, cookie, images.jpeg(), '../../../etc/passwd.jpg', 'image/jpeg'))
    expect(item.filename).toBe('passwd.jpg')
    const patched = await body<MediaItem>(await h.api('PATCH', `/api/media/${item.id}`, { cookie, body: { filename: '../a/b/Nowa Nazwa.exe', alt: 'Nowy alt' } }))
    expect(patched).toMatchObject({ filename: 'nowa-nazwa.jpg', alt: 'Nowy alt' })
  })

  it('użycia, usunięcie z 409 i z force=1, uprawnienie MEDIA_DELETE', async () => {
    const h = setup()
    const editor = await h.login('editor')
    const item = await body<MediaItem>(await upload(h, editor, images.webp(), 'hero.webp', 'image/webp'))
    const other = await body<MediaItem>(await upload(h, editor, images.png(), 'inne.png'))
    const page = homePage()
    page.blocks[0]!.props.image = { mediaId: item.id, src: item.url, alt: 'Hero', width: 1920, height: 1080 }
    page.blocks[1]!.props.body = `zobacz ${other.url}`
    const saved = await h.api('PUT', '/api/entities/page_home/draft', { cookie: editor, body: { baseRev: 1, data: page } })
    expect(saved.status).toBe(200)

    const usage = await body<{ usages: { entityId: string, path: string }[] }>(await h.api('GET', `/api/media/${item.id}/usage`, { cookie: editor }))
    expect(usage.usages).toEqual([expect.objectContaining({ entityId: 'page_home', path: 'draft.blocks.0.props.image' })])
    const usage2 = await body<{ usages: { path: string }[] }>(await h.api('GET', `/api/media/${other.id}/usage`, { cookie: editor }))
    expect(usage2.usages.map(u => u.path)).toEqual(['draft.blocks.1.props.body'])

    const content = await h.login('content_editor')
    expect((await h.api('DELETE', `/api/media/${item.id}`, { cookie: content })).status).toBe(403)

    const blocked = await h.api('DELETE', `/api/media/${item.id}`, { cookie: editor })
    expect(blocked.status).toBe(409)
    expect(await body(blocked)).toMatchObject({ error: 'in_use' })
    const forced = await h.api('DELETE', `/api/media/${item.id}?force=1`, { cookie: editor })
    expect(forced.status).toBe(200)
    expect(h.media.store.has(`media:${item.id}`)).toBe(false)
    expect(h.db.raw.prepare('SELECT COUNT(*) AS n FROM audit_log WHERE action = \'media_delete\'').get()).toEqual({ n: 1 })
  })

  it('podmiana pliku zachowuje id i adres', async () => {
    const h = setup()
    const cookie = await h.login('editor')
    const item = await body<MediaItem>(await upload(h, cookie, images.png(), 'zdjecie.png'))
    const res = await upload(h, cookie, images.jpeg(), 'cokolwiek.jpg', 'image/jpeg', `/api/media/${item.id}/replace`)
    expect(res.status).toBe(200)
    const replaced = await body<MediaItem>(res)
    expect(replaced).toMatchObject({ id: item.id, mime: 'image/jpeg', width: 400, height: 300, filename: 'zdjecie.jpg' })
    const file = await h.app.fetch(new Request(`${ORIGIN}${item.url}`), h.env)
    expect(file.headers.get('Content-Type')).toBe('image/jpeg')
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(images.jpeg())
    expect((await upload(h, cookie, u8('<svg/>'), 'x.svg', 'image/svg+xml', `/api/media/${item.id}/replace`)).status).toBe(415)
  })

  it('obraz z biblioteki przechodzi walidację strony i trafia do publicznego snapshotu po publikacji', async () => {
    const h = setup()
    const cookie = await h.login('editor')
    const item = await body<MediaItem>(await upload(h, cookie, images.png(), 'a.png'))
    const page = homePage()
    page.blocks[0]!.props.image = { mediaId: item.id, src: item.url, alt: 'A' }
    await h.api('PUT', '/api/entities/page_home/draft', { cookie, body: { baseRev: 1, data: page } })
    await h.api('POST', '/api/entities/page_home/publish', { cookie, body: { expectedRev: 2 } })
    const site = await body<{ pages: Record<string, PageDocument> }>(await h.api('GET', '/api/public/site'))
    expect(site.pages['']!.blocks[0]!.props.image).toMatchObject({ mediaId: item.id })
  })
})
