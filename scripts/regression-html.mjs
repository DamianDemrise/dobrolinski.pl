#!/usr/bin/env node
/**
 * Regresja HTML: świeży `nuxt generate` (.output/public) kontra baseline.
 * Body: identyczny DOM po normalizacji (hashe _nuxt, buildId, prerenderedAt,
 * kotwice hydratacji Vue <!--[--> <!--]--> <!---->, data-v-*).
 * Head: zbiory tagów (posortowane, bez duplikatów po normalizacji hashy).
 * Pliki tekstowe (sitemap.xml, robots.txt): identyczne bajt w bajt.
 *
 * Użycie: node scripts/regression-html.mjs [--baseline <dir>] [--output <dir>]
 * Kod wyjścia 1 przy dowolnej różnicy.
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const args = process.argv.slice(2)
const argValue = (name, fallback) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}
const BASELINE = resolve(argValue('--baseline', process.env.CMS_BASELINE_DIR || '../dobrolinski-cms-baseline/public'))
const OUTPUT = resolve(argValue('--output', '.output/public'))

const HTML_FILES = ['index.html', 'poznaj-czlowieka.html', 'polityka-prywatnosci.html', '404.html', '200.html']
const TEXT_FILES = ['sitemap.xml', 'robots.txt']

const normalizeAssets = s => s.replace(/\/_nuxt\/[\w.-]+\.(js|css)\b/g, '/_nuxt/[asset].$1')

function normalizeNuxtData(json) {
  try {
    const data = JSON.parse(json)
    if (Array.isArray(data)) {
      for (const node of data) {
        if (node && typeof node === 'object' && !Array.isArray(node) && typeof node.prerenderedAt === 'number') {
          data[node.prerenderedAt] = 0
        }
      }
    }
    return JSON.stringify(data)
  }
  catch {
    return json
  }
}

function splitDoc(html) {
  const head = /<head>([\s\S]*?)<\/head>/.exec(html)?.[1] ?? ''
  const body = /<body[^>]*>([\s\S]*?)<\/body>/.exec(html)?.[1] ?? ''
  const htmlAttrs = /<html([^>]*)>/.exec(html)?.[1]?.trim().replace(/\s+/g, ' ') ?? ''
  const bodyAttrs = /<body([^>]*)>/.exec(html)?.[1]?.trim() ?? ''
  return { head, body, htmlAttrs, bodyAttrs }
}

function headTags(head) {
  const tags = []
  const re = /<(title|script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>|<[a-z]+\b[^>]*>/gi
  for (const match of head.matchAll(re)) tags.push(normalizeAssets(match[0]))
  return [...new Set(tags)].sort()
}

function normalizeBody(body) {
  return normalizeAssets(body)
    .replace(/buildId:"[^"]*"/g, 'buildId:"[id]"')
    .replace(/(<script[^>]*id="__NUXT_DATA__"[^>]*>)([\s\S]*?)(<\/script>)/, (_m, open, json, close) => open + normalizeNuxtData(json) + close)
    .replace(/<!--\[-->|<!--\]-->|<!---->/g, '')
    .replace(/\sdata-v-[a-z0-9]+(="[^"]*")?/g, '')
}

/** Jeden tag lub tekst na linię: czytelny diff. */
const toLines = s => s.replace(/></g, '>\n<').split('\n')

function lineDiff(a, b, context = 3) {
  const A = toLines(a)
  const B = toLines(b)
  let start = 0
  while (start < A.length && start < B.length && A[start] === B[start]) start++
  let endA = A.length - 1
  let endB = B.length - 1
  while (endA > start && endB > start && A[endA] === B[endB]) {
    endA--
    endB--
  }
  const out = []
  for (let i = Math.max(0, start - context); i < start; i++) out.push(`  ${A[i]}`)
  for (let i = start; i <= endA && i < start + 40; i++) out.push(`- ${A[i]}`)
  for (let i = start; i <= endB && i < start + 40; i++) out.push(`+ ${B[i]}`)
  for (let i = endA + 1; i < Math.min(A.length, endA + 1 + context); i++) out.push(`  ${A[i]}`)
  return out.join('\n')
}

const failures = []

for (const file of HTML_FILES) {
  const basePath = resolve(BASELINE, file)
  const outPath = resolve(OUTPUT, file)
  if (!existsSync(basePath)) {
    if (file === '200.html') continue
    failures.push(`${file}: brak w baseline (${basePath})`)
    continue
  }
  if (!existsSync(outPath)) {
    failures.push(`${file}: brak w buildzie (${outPath})`)
    continue
  }
  const base = splitDoc(readFileSync(basePath, 'utf8'))
  const next = splitDoc(readFileSync(outPath, 'utf8'))

  if (base.htmlAttrs !== next.htmlAttrs) failures.push(`${file}: <html> ${base.htmlAttrs} → ${next.htmlAttrs}`)
  if (base.bodyAttrs !== next.bodyAttrs) failures.push(`${file}: <body> ${base.bodyAttrs} → ${next.bodyAttrs}`)

  const headA = headTags(base.head)
  const headB = headTags(next.head)
  const missing = headA.filter(t => !headB.includes(t))
  const extra = headB.filter(t => !headA.includes(t))
  if (missing.length || extra.length) {
    failures.push(`${file}: head różni się\n${missing.map(t => `- ${t}`).join('\n')}\n${extra.map(t => `+ ${t}`).join('\n')}`)
  }

  const bodyA = normalizeBody(base.body)
  const bodyB = normalizeBody(next.body)
  if (bodyA !== bodyB) failures.push(`${file}: body różni się\n${lineDiff(bodyA, bodyB)}`)
}

for (const file of TEXT_FILES) {
  const basePath = resolve(BASELINE, file)
  const outPath = resolve(OUTPUT, file)
  if (!existsSync(outPath) || !existsSync(basePath)) {
    failures.push(`${file}: brak pliku (${existsSync(basePath) ? outPath : basePath})`)
    continue
  }
  const a = readFileSync(basePath, 'utf8')
  const b = readFileSync(outPath, 'utf8')
  if (a !== b) failures.push(`${file}: różni się\n${lineDiff(a, b)}`)
}

if (failures.length) {
  console.error(`Regresja HTML: ${failures.length} różnic(e)\nbaseline: ${BASELINE}\nbuild:    ${OUTPUT}\n`)
  console.error(failures.join('\n\n'))
  process.exit(1)
}
console.log(`Regresja HTML: brak różnic (${HTML_FILES.length} stron + ${TEXT_FILES.length} pliki) względem ${BASELINE}`)
