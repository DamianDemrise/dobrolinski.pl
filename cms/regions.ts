import type { BlockType } from './types'

/**
 * Obszar layoutu każdego typu bloku. Jedno źródło dla schematu (schema.ts)
 * i dla renderera w publicznym bundlu (bez ładowania definicji pól).
 */
export const blockRegions: Record<BlockType, string> = {
  'home-stage': 'identity',
  'current-project': 'identity',
  'contact-links': 'identity',
  'site-footer': 'footer',
  'back-link': 'back',
  'workshop-hero': 'hero',
  'workshop-manifest': 'main',
  'workshop-program': 'main',
  'workshop-beliefs': 'main',
  'workshop-parts': 'main',
  'workshop-about': 'main',
  'workshop-audience': 'main',
  'workshop-process': 'main',
  'workshop-closing': 'main',
  'privacy-document': 'main',
  'ebook-hero': 'ebook',
  'ebook-contents': 'ebook',
  'ebook-form': 'ebook',
}

export const layoutRegions = {
  home: ['identity', 'footer'],
  workshop: ['hero', 'main', 'back'],
  document: ['main', 'back'],
  // Własny obszar: bloki ebooka nie trafiają do palety innych stron.
  ebook: ['ebook', 'back'],
} as const

export type LayoutName = keyof typeof layoutRegions
