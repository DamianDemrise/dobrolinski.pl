/**
 * Kontekst CMS w aplikacji Nuxt (przyszłe @demrise/nuxt).
 *
 * Tryb publiczny: brak kontekstu edycji; treść pochodzi z content/published.json.
 * Tryb edycji: panel (build CMS_ADMIN=1) robi `provide(CMS_EDIT_CONTEXT, ctx)` nad
 * <CmsPageView :page="ctx.page.value" /> i podaje reaktywny draft zamiast snapshotu.
 */
import type { ComponentDocument, Device, GlobalDocument, PageDocument, TokensDocument } from '@demrise/cms-core'
import type { ComputedRef, InjectionKey, Ref } from 'vue'
import { computed, inject } from 'vue'
import type { Globals } from '~~/cms/types'
import { publishedPage, publishedSite } from './published'

/** Globale, komponenty globalne i tokeny: wszystko poza dokumentem strony. */
export interface CmsSiteData {
  globals: Record<string, GlobalDocument>
  components: Record<string, ComponentDocument>
  tokens: TokensDocument
}

export interface CmsEditContext {
  /** Edytowany dokument strony (draft). */
  page: Ref<PageDocument>
  /** Globale, komponenty i tokeny, które widzi podgląd (draft albo opublikowane). */
  site: Ref<CmsSiteData>
  /** Pokazuj bloki z `hidden: true` (np. przygaszone w edytorze). Domyślnie nie. */
  showHidden?: Ref<boolean>
  /** Urządzenie podglądu (informacyjnie dla edytora). */
  device?: Ref<Device>
}

/** Klucz provide/inject kontekstu edycji. Symbol.for: ten sam klucz w całym buildzie panelu. */
export const CMS_EDIT_CONTEXT: InjectionKey<CmsEditContext> = Symbol.for('demrise.cms.edit')

/** Blok, w którym renderuje się komponent (dostarcza renderer, czyta dyrektywa v-cms). */
export interface CmsBlockScope {
  id: string
  type: string
  /** Id komponentu globalnego, gdy blok jest jego instancją. */
  globalRef?: string
}
export const CMS_BLOCK_SCOPE: InjectionKey<CmsBlockScope> = Symbol.for('demrise.cms.block')

export const useCmsEditContext = (): CmsEditContext | null => inject(CMS_EDIT_CONTEXT, null)

const publishedData: CmsSiteData = {
  globals: publishedSite.globals,
  components: publishedSite.components,
  tokens: publishedSite.tokens,
}

/** Globale, komponenty i tokeny: draft w trybie edycji, inaczej snapshot. */
export function useCmsSite(): ComputedRef<CmsSiteData> {
  const edit = useCmsEditContext()
  return computed(() => edit?.site.value ?? publishedData)
}

/** Globale tej strony z typami (site, workshop). */
export function useCmsGlobals(): ComputedRef<Globals> {
  const site = useCmsSite()
  return computed(() => site.value.globals as unknown as Globals)
}

/** Dokument strony: draft z kontekstu edycji (gdy dotyczy tego slugu) albo opublikowany. */
export function useCmsPage(slug: string): ComputedRef<PageDocument> {
  const edit = useCmsEditContext()
  const published = publishedPage(slug)
  return computed(() => (edit && edit.page.value.slug === slug ? edit.page.value : published))
}
