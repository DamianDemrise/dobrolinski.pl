/**
 * Lokalny endpoint bez Cloudflare i bez wysyłki (tryb dry):
 * `node offer-worker/scripts/dev-server.ts` → http://localhost:8787
 * DEV_FAIL=network|5xx|slow symuluje awarię, żeby sprawdzić stan błędu formularza.
 */
import { existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { handleRequest } from '../src/index.ts'
import { memoryKV } from './memory-kv.ts'

const kv = memoryKV()
const fail = process.env.DEV_FAIL
const pdf = new URL('../../public/oferta/poznaj-czlowieka.pdf', import.meta.url)

const fakeFetch = (async () => new Response(null, { status: existsSync(pdf) ? 200 : 404 })) as typeof fetch

createServer(async (req, res) => {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  if (fail === 'slow') await new Promise(resolve => setTimeout(resolve, 3000))
  if (fail === 'network' && req.method === 'POST') {
    req.socket.destroy()
    return
  }
  const request = new Request(`http://localhost:8787${req.url}`, {
    method: req.method,
    headers: { ...req.headers as Record<string, string>, 'CF-Connecting-IP': req.socket.remoteAddress ?? 'local' },
    body: req.method === 'POST' ? Buffer.concat(chunks) : undefined,
  })
  const response = fail === '5xx' && req.method === 'POST'
    ? new Response('{"ok":false,"error":"unavailable"}', { status: 502, headers: { 'Access-Control-Allow-Origin': req.headers.origin ?? '' } })
    : await handleRequest(request, {
        OFFER_KV: kv,
        MAIL_MODE: 'dry',
        ALLOWED_ORIGINS: 'http://localhost:3000,http://localhost:4880',
      }, fakeFetch)
  res.writeHead(response.status, Object.fromEntries(response.headers))
  res.end(await response.text())
}).listen(8787, () => console.log('offer dev endpoint: http://localhost:8787 (dry)'))
