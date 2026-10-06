import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const path = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      { find: '@demrise/cms-core', replacement: path('./packages/cms-core/src/index.ts') },
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
      'packages/*/test/**/*.test.ts',
      'cms-worker/test/**/*.test.ts',
    ],
  },
})
