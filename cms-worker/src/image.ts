/**
 * Rozpoznanie typu obrazu wyłącznie po magic bytes (nie po rozszerzeniu ani Content-Type)
 * i odczyt wymiarów z nagłówka. SVG i wszystko inne jest odrzucane.
 */

export type ImageMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif' | 'image/gif'

export const EXTENSIONS: Record<ImageMime, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
}

export interface ImageInfo { mime: ImageMime, width: number | null, height: number | null }

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.subarray(start, start + length))

const be16 = (b: Uint8Array, i: number) => (b[i]! << 8) | b[i + 1]!
const be32 = (b: Uint8Array, i: number) => ((b[i]! << 24) >>> 0) + (b[i + 1]! << 16) + (b[i + 2]! << 8) + b[i + 3]!
const le16 = (b: Uint8Array, i: number) => b[i]! | (b[i + 1]! << 8)
const le24 = (b: Uint8Array, i: number) => b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16)

function dims(width: number, height: number): { width: number | null, height: number | null } {
  return width > 0 && height > 0 ? { width, height } : { width: null, height: null }
}

function png(b: Uint8Array) {
  if (b.length < 24 || ascii(b, 12, 4) !== 'IHDR') return dims(0, 0)
  return dims(be32(b, 16), be32(b, 20))
}

function gif(b: Uint8Array) {
  return b.length >= 10 ? dims(le16(b, 6), le16(b, 8)) : dims(0, 0)
}

function jpeg(b: Uint8Array) {
  let i = 2
  while (i + 9 < b.length) {
    if (b[i] !== 0xFF) {
      i++
      continue
    }
    const marker = b[i + 1]!
    if (marker === 0xFF) {
      i++
      continue
    }
    if (marker === 0xD8 || marker === 0x01 || (marker >= 0xD0 && marker <= 0xD7)) {
      i += 2
      continue
    }
    const length = be16(b, i + 2)
    const isSof = marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC
    if (isSof) return dims(be16(b, i + 7), be16(b, i + 5))
    if (length < 2) break
    i += 2 + length
  }
  return dims(0, 0)
}

function webp(b: Uint8Array) {
  if (b.length < 30) return dims(0, 0)
  const chunk = ascii(b, 12, 4)
  if (chunk === 'VP8 ') return dims(le16(b, 26) & 0x3FFF, le16(b, 28) & 0x3FFF)
  if (chunk === 'VP8L' && b[20] === 0x2F) {
    const bits = (b[21]! | (b[22]! << 8) | (b[23]! << 16) | (b[24]! << 24)) >>> 0
    return dims((bits & 0x3FFF) + 1, ((bits >>> 14) & 0x3FFF) + 1)
  }
  if (chunk === 'VP8X') return dims(1 + le24(b, 24), 1 + le24(b, 27))
  return dims(0, 0)
}

/** AVIF: wymiary z boksu 'ispe' (pierwsze wystąpienie w nagłówku); brak = null. */
function avif(b: Uint8Array) {
  const limit = Math.min(b.length - 15, 65536)
  for (let i = 4; i < limit; i++) {
    if (b[i] === 0x69 && b[i + 1] === 0x73 && b[i + 2] === 0x70 && b[i + 3] === 0x65) {
      return dims(be32(b, i + 8), be32(b, i + 12))
    }
  }
  return dims(0, 0)
}

function isAvif(b: Uint8Array): boolean {
  if (b.length < 16 || ascii(b, 4, 4) !== 'ftyp') return false
  const boxSize = Math.min(be32(b, 0), b.length, 256)
  const brands = [ascii(b, 8, 4)]
  for (let i = 16; i + 4 <= boxSize; i += 4) brands.push(ascii(b, i, 4))
  return brands.includes('avif') || brands.includes('avis')
}

export function sniffImage(buffer: ArrayBuffer): ImageInfo | null {
  const b = new Uint8Array(buffer)
  if (b.length >= 8 && b[0] === 0x89 && ascii(b, 1, 3) === 'PNG' && b[4] === 0x0D && b[5] === 0x0A && b[6] === 0x1A && b[7] === 0x0A) {
    return { mime: 'image/png', ...png(b) }
  }
  if (b.length >= 3 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return { mime: 'image/jpeg', ...jpeg(b) }
  if (b.length >= 6 && (ascii(b, 0, 6) === 'GIF87a' || ascii(b, 0, 6) === 'GIF89a')) return { mime: 'image/gif', ...gif(b) }
  if (b.length >= 12 && ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') return { mime: 'image/webp', ...webp(b) }
  if (isAvif(b)) return { mime: 'image/avif', ...avif(b) }
  return null
}

/** Nazwa pliku: bez ścieżki, małe litery, a-z0-9-., najwyżej 80 znaków, rozszerzenie zgodne z typem. */
export function sanitizeFilename(name: string, mime: ImageMime): string {
  const base = name.split(/[\\/]/).pop() ?? ''
  const withoutExt = base.replace(/\.[^.]*$/, '')
  const cleaned = withoutExt
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'l')
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/\.{2,}/g, '.')
    .replace(/-{2,}/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
  const ext = EXTENSIONS[mime]
  const stem = (cleaned || 'image').slice(0, 80 - ext.length - 1).replace(/[.-]+$/, '') || 'image'
  return `${stem}.${ext}`
}
