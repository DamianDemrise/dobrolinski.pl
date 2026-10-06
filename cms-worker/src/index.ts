/** Punkt wejścia Workera dobrolinski-cms. Schemat strony z cms/schema.ts. */
import { siteSchema } from '../../cms/schema'
import { createApp } from './app'

export default createApp({ schema: siteSchema })
