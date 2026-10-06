#!/usr/bin/env node
/**
 * Tokeny projektu (content/published.json → tokens) → app/assets/css/tokens.css.
 * Mapa tokenów na zmienne CSS: cms/tokens-css.json (te same nazwy i selektory co przed CMS,
 * więc obliczone style się nie zmieniają). Uruchamiane przez `npm run cms:tokens` i cms-pull.
 *
 * Użycie: node scripts/cms-tokens.mjs [--check]   (--check: kod 1, gdy plik jest nieaktualny)
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateTokensCss } from '../vendor/demrise-cms/scripts/tokens-css.mjs'

export { generateTokensCss }

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const TOKENS_CSS_PATH = resolve(ROOT, 'app/assets/css/tokens.css')
const MAP_PATH = resolve(ROOT, 'cms/tokens-css.json')
const PUBLISHED_PATH = resolve(ROOT, 'content/published.json')

export function tokensCssFromFiles(publishedPath = PUBLISHED_PATH) {
  const site = JSON.parse(readFileSync(publishedPath, 'utf8'))
  const map = JSON.parse(readFileSync(MAP_PATH, 'utf8'))
  return generateTokensCss(site.tokens, map)
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const css = tokensCssFromFiles()
  if (process.argv.includes('--check')) {
    const current = readFileSync(TOKENS_CSS_PATH, 'utf8')
    if (current !== css) {
      console.error('tokens.css jest nieaktualny: uruchom npm run cms:tokens')
      process.exit(1)
    }
    console.log('tokens.css aktualny')
  }
  else {
    writeFileSync(TOKENS_CSS_PATH, css)
    console.log(`Zapisano ${TOKENS_CSS_PATH}`)
  }
}
