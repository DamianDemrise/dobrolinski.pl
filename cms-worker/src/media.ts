/**
 * Biblioteka mediów: binaria w KV (media:<id>), metadane w D1.
 * Typ pliku tylko z magic bytes (jpeg, png, webp, avif, gif), limit 5 MB.
 * Podmiana pliku zachowuje id, więc wszystkie użycia pokazują nowy obraz.
 */
import { auditStatement } from './audit'
import { currentUser, nowIso, type Ctx } from './context'
import { randomId, sha256Hex } from './crypto'
import { LIMITS } from './env'
import { requirePermission } from './guard'
import { fail, json, readJson } from './http'
import { EXTENSIONS, sanitizeFilename, sniffImage, type ImageInfo, type ImageMime } from './image'
import { toMediaItem, type MediaRow } from './rows'
import { mediaUsages } from './usage'

const MEDIA_ID = /^med_[0-9a-f]{20}$/
const MULTIPART_OVERHEAD = 64 * 1024

export function cleanAlt(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') throw fail(400, 'bad_request', { message: 'alt' })
  // eslint-disable-next-line no-control-regex
  const alt = value.replace(/[\u0000-\u001F\u007F]+/g, ' ').trim()
  if (alt.length > 300) throw fail(400, 'bad_request', { message: 'alt' })
  return alt
}

async function loadMedia(ctx: Ctx, id: string): Promise<MediaRow> {
  if (!MEDIA_ID.test(id)) throw fail(404, 'not_found')
  const row = await ctx.env.DB.prepare('SELECT * FROM media WHERE id = ?').bind(id).first<MediaRow>()
  if (!row) throw fail(404, 'not_found')
  return row
}

interface Upload { bytes: ArrayBuffer, name: string, info: ImageInfo & { mime: ImageMime }, alt: string | undefined, hash: string }

async function readUpload(ctx: Ctx): Promise<Upload> {
  const declared = Number(ctx.request.headers.get('Content-Length') ?? 0)
  if (declared > LIMITS.mediaBytes + MULTIPART_OVERHEAD) throw fail(413, 'too_large')
  if (!(ctx.request.headers.get('Content-Type') ?? '').toLowerCase().startsWith('multipart/form-data')) {
    throw fail(400, 'bad_request', { message: 'multipart' })
  }
  let form: FormData
  try {
    form = await ctx.request.formData()
  }
  catch {
    throw fail(400, 'bad_request', { message: 'multipart' })
  }
  const file = form.get('file')
  if (!file || typeof file === 'string') throw fail(400, 'bad_request', { message: 'file' })
  if (file.size > LIMITS.mediaBytes) throw fail(413, 'too_large')
  const bytes = await file.arrayBuffer()
  if (bytes.byteLength > LIMITS.mediaBytes) throw fail(413, 'too_large')
  const info = sniffImage(bytes)
  if (!info) throw fail(415, 'unsupported_type')
  const altRaw = form.get('alt')
  return {
    bytes,
    name: typeof file.name === 'string' ? file.name : '',
    info,
    alt: altRaw === null ? undefined : cleanAlt(altRaw),
    hash: await sha256Hex(bytes),
  }
}

export async function listMedia(ctx: Ctx): Promise<Response> {
  const { results } = await ctx.env.DB.prepare('SELECT * FROM media ORDER BY created_at DESC, id').all<MediaRow>()
  return json({ items: results.map(toMediaItem) })
}

export async function getMedia(ctx: Ctx): Promise<Response> {
  return json(toMediaItem(await loadMedia(ctx, ctx.params.id!)))
}

export async function uploadMedia(ctx: Ctx): Promise<Response> {
  requirePermission(ctx, 'MEDIA_UPLOAD')
  const upload = await readUpload(ctx)
  const id = randomId('med')
  const kvKey = `media:${id}`
  const now = nowIso(ctx)
  await ctx.env.MEDIA.put(kvKey, upload.bytes)
  await ctx.env.DB.prepare(
    `INSERT INTO media (id, filename, mime, size, width, height, alt, created_at, created_by, kv_key, updated_at, hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    id, sanitizeFilename(upload.name, upload.info.mime), upload.info.mime, upload.bytes.byteLength,
    upload.info.width, upload.info.height, upload.alt ?? '', now, currentUser(ctx).id, kvKey, now, upload.hash,
  ).run()
  return json(toMediaItem(await loadMedia(ctx, id)), 201)
}

/** Nowy plik pod tym samym id. Nazwa zostaje, zmienia się tylko rozszerzenie, gdy zmienił się typ. */
export async function replaceMedia(ctx: Ctx): Promise<Response> {
  requirePermission(ctx, 'MEDIA_UPLOAD')
  const row = await loadMedia(ctx, ctx.params.id!)
  // Podmiana pliku użytego w opublikowanej treści zmienia produkcję przy najbliższym buildzie,
  // więc jest publikacją: wymaga CONTENT_PUBLISH.
  if ((await mediaUsages(ctx, row.id)).some(usage => usage.path.startsWith('published'))) requirePermission(ctx, 'CONTENT_PUBLISH')
  const upload = await readUpload(ctx)
  const stem = row.filename.replace(/\.[^.]*$/, '')
  await ctx.env.MEDIA.put(row.kv_key, upload.bytes)
  await ctx.env.DB.prepare(
    'UPDATE media SET filename = ?, mime = ?, size = ?, width = ?, height = ?, alt = ?, updated_at = ?, hash = ? WHERE id = ?',
  ).bind(
    sanitizeFilename(`${stem}.${EXTENSIONS[upload.info.mime]}`, upload.info.mime), upload.info.mime, upload.bytes.byteLength,
    upload.info.width, upload.info.height, upload.alt ?? row.alt, nowIso(ctx), upload.hash, row.id,
  ).run()
  return json(toMediaItem(await loadMedia(ctx, row.id)))
}

export async function patchMedia(ctx: Ctx): Promise<Response> {
  requirePermission(ctx, 'MEDIA_UPLOAD')
  const body = await readJson(ctx.request)
  const row = await loadMedia(ctx, ctx.params.id!)
  const alt = body.alt === undefined ? row.alt : cleanAlt(body.alt)
  let filename = row.filename
  if (body.filename !== undefined) {
    if (typeof body.filename !== 'string' || body.filename.length > 200) throw fail(400, 'bad_request', { message: 'filename' })
    filename = sanitizeFilename(body.filename, row.mime as ImageMime)
  }
  await ctx.env.DB.prepare('UPDATE media SET alt = ?, filename = ?, updated_at = ? WHERE id = ?').bind(alt, filename, nowIso(ctx), row.id).run()
  return json(toMediaItem(await loadMedia(ctx, row.id)))
}

export async function mediaUsage(ctx: Ctx): Promise<Response> {
  const row = await loadMedia(ctx, ctx.params.id!)
  return json({ usages: await mediaUsages(ctx, row.id) })
}

export async function deleteMedia(ctx: Ctx): Promise<Response> {
  requirePermission(ctx, 'MEDIA_DELETE')
  const row = await loadMedia(ctx, ctx.params.id!)
  const force = ctx.url.searchParams.get('force') === '1'
  const usages = await mediaUsages(ctx, row.id)
  if (usages.length && !force) throw fail(409, 'in_use', { usages })
  await ctx.env.DB.batch([
    ctx.env.DB.prepare('DELETE FROM media WHERE id = ?').bind(row.id),
    auditStatement(ctx, 'media_delete', currentUser(ctx).id, row.id, { filename: row.filename, forced: force, usages: usages.length }),
  ])
  await ctx.env.MEDIA.delete(row.kv_key)
  return json({ ok: true })
}

/** Publiczny plik: GET /media/:id/:filename. Nazwa w URL jest kosmetyczna, plik wybiera id. */
export async function serveMedia(ctx: Ctx): Promise<Response> {
  const id = ctx.params.id!
  const row = MEDIA_ID.test(id)
    ? await ctx.env.DB.prepare('SELECT * FROM media WHERE id = ?').bind(id).first<MediaRow>()
    : null
  if (!row) return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  const etag = `"${(row.hash ?? `${row.size}-${row.updated_at ?? row.created_at}`).slice(0, 32)}"`
  const headers: Record<string, string> = {
    'Content-Type': row.mime,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'ETag': etag,
    'Content-Disposition': `inline; filename="${row.filename}"`,
    'Content-Security-Policy': 'default-src \'none\'; img-src \'self\'; style-src \'unsafe-inline\'; sandbox',
  }
  if (ctx.request.headers.get('If-None-Match') === etag) return new Response(null, { status: 304, headers })
  const bytes = await ctx.env.MEDIA.get(row.kv_key, 'arrayBuffer')
  if (!bytes) return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  return new Response(ctx.request.method === 'HEAD' ? null : bytes, { status: 200, headers: { ...headers, 'Content-Length': String(bytes.byteLength) } })
}
