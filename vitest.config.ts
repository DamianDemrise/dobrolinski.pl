import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const path = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      { find: '@demrise/cms-core', replacement: path('./vendor/demrise-cms/core/src/index.ts') },
      // DEMRISE CMS z submodułu: runtime Nuxt i warstwa panelu (alias z vendor/demrise-cms/nuxt/nuxt.config.ts).
      { find: /^@demrise\/cms-runtime\//, replacement: path('./vendor/demrise-cms/runtime/') },
      { find: /^#cms-admin\//, replacement: path('./vendor/demrise-cms/nuxt/app/') },
      // Testy app/cms poza Nuxtem: komponenty .vue jako zaślepki, aliasy katalogów Nuxta.
      { find: /^~\/components\/.+\.vue$/, replacement: path('./tests/fixtures/block-stub.ts') },
      { find: /^~~\//, replacement: `${path('./')}` },
      { find: /^~\//, replacement: `${path('./app/')}` },
      { find: '#imports', replacement: path('./tests/fixtures/nuxt-imports.ts') },
    ],
  },
  test: {
    environment: 'happy-dom',
    include: [
      'tests/**/*.test.ts',
      'cms-worker/test/**/*.test.ts',
      'vendor/demrise-cms/*/test/**/*.test.ts',
    ],
  },
})
