import type { PageDocument } from '@demrise/cms-core'
import type { ComputedRef } from 'vue'
import { useHead } from '#imports'
import { seoHead } from './seo'

/** Tagi <head> strony z pól SEO dokumentu (reaktywnie: w edytorze podąża za draftem). */
export function useCmsPageHead(page: ComputedRef<PageDocument>, ogType: string) {
  useHead(() => seoHead(page.value.seo, ogType))
}
