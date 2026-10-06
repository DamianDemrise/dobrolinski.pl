#!/usr/bin/env node
/**
 * Po `CMS_ADMIN=1 nuxt generate`: kopiuje .output/public do cms-worker/admin-dist
 * (statyczne assety panelu serwowane przez Worker). Wywołuje `npm run cms:build`.
 */
import { copyFileSync, cpSync, existsSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = resolve(ROOT, '.output/public')
const TARGET = resolve(ROOT, 'cms-worker/admin-dist')

if (!existsSync(SOURCE)) {
  console.error(`Brak ${SOURCE}: najpierw CMS_ADMIN=1 nuxt generate`)
  process.exit(1)
}
rmSync(TARGET, { recursive: true, force: true })
cpSync(SOURCE, TARGET, { recursive: true, dereference: true })
// SPA: Worker (not_found_handling = single-page-application) serwuje index.html dla /admin/*.
const shell = resolve(TARGET, 'admin.html')
if (existsSync(shell)) {
  copyFileSync(shell, resolve(TARGET, 'index.html'))
  copyFileSync(shell, resolve(TARGET, '200.html'))
}
console.log(`Panel CMS skopiowany do ${TARGET}`)
