/**
 * Typowany dostęp do polityki prywatności w content/published.json.
 * Polityka: baza Demrise sp. z o.o., dostosowana do tego, co Serwis faktycznie robi
 * (docs/PRIVACY-AUDIT.md). Linki w tekście: [[adres|etykieta]], renderuje PrivacyDocument.vue.
 */
import type { PageDocument } from '@demrise/cms-core'
import { publishedContent } from './site'
import { pageBlock } from './workshop'

export const privacyPage = publishedContent.pages['polityka-prywatnosci'] as PageDocument

export const privacy = pageBlock(privacyPage, 'privacy-document')
