/** Punkt wejścia Workera dobrolinski-cms. Schemat strony z cms/schema.ts, układ plików repo poniżej. */
import { siteSchema } from '../../cms/schema'
import tokensMap from '../../cms/tokens-css.json'
import { createApp } from './app'

export default createApp({
  schema: siteSchema,
  repo: {
    snapshotPath: 'content/published.json',
    tokensCss: { path: 'app/assets/css/tokens.css', map: tokensMap as never },
    mediaDir: 'public/media',
  },
})
