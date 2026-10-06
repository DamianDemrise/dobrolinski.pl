<!--
  Podgląd wersji roboczej: strona renderowana jak publiczna (CmsPageView w main.site-stage),
  z draftami strony, globali, komponentów i tokenów. Nigdy nie publikuje.
-->
<script setup lang="ts">
import { adminAuth } from '~/admin/auth-guard'
import type { ComponentDocument, Entity, EntitySummary, GlobalDocument, PageDocument, TokensDocument } from '@demrise/cms-core'
import type { Ref } from 'vue'
import { onMounted, provide, ref, shallowRef } from 'vue'
import { cmsApi } from '~/admin/api'
import { errorMessage } from '~/admin/format'
import CmsPageView from '~/cms/CmsPageView'
import type { CmsSiteData } from '~/cms/context'
import { CMS_EDIT_CONTEXT } from '~/cms/context'

definePageMeta({ middleware: [adminAuth] })

const route = useRoute()
const id = String(route.params.id)
const page = shallowRef<PageDocument | null>(null)
const site = shallowRef<CmsSiteData | null>(null)
const error = ref('')
// Kontekst edycji tylko dostarcza draft; ukryte bloki zostają ukryte jak na stronie publicznej.
provide(CMS_EDIT_CONTEXT, { page: page as Ref<PageDocument>, site: site as Ref<CmsSiteData>, showHidden: ref(false) })
useHead(() => ({ title: `Podgląd: ${page.value?.seo.title ?? ''}`, htmlAttrs: { class: 'cms-preview' }, meta: [{ name: 'robots', content: 'noindex' }] }))

onMounted(async () => {
  try {
    const entity = await cmsApi.get<Entity<'page'>>(`/api/entities/${encodeURIComponent(id)}`)
    const lists = await Promise.all((['global', 'component', 'tokens'] as const).map(kind => cmsApi.get<{ items: EntitySummary[] }>(`/api/entities?kind=${kind}`)))
    const all = await Promise.all(lists.flatMap(l => l.items).map(s => cmsApi.get<Entity>(`/api/entities/${encodeURIComponent(s.id)}`)))
    const data: CmsSiteData = { globals: {}, components: {}, tokens: { colors: {}, typography: {}, spacing: {}, widths: {}, radius: {}, breakpoints: {} } }
    for (const e of all) {
      if (e.kind === 'global') data.globals[e.slug] = e.draft as GlobalDocument
      else if (e.kind === 'component') data.components[e.id] = data.components[e.slug] = e.draft as ComponentDocument
      else if (e.kind === 'tokens') data.tokens = e.draft as TokensDocument
    }
    site.value = data
    page.value = entity.draft
  }
  catch (e) {
    error.value = errorMessage(e)
  }
})
</script>

<template>
  <main class="site-stage has-navigated">
    <div class="ambient-light" aria-hidden="true" />
    <CmsPageView v-if="page && site" :page="page" />
    <p v-else-if="error" class="cms-preview-banner" role="alert" style="top: 50%">Nie udało się wczytać podglądu: {{ error }}</p>
    <div class="cms-preview-banner" role="status">
      Podgląd wersji roboczej — niepublikowane
      <a :href="`/admin/edit/${id}`">Wróć do edytora</a>
    </div>
  </main>
</template>

<style>
.cms-preview-banner {
  position: fixed;
  z-index: 2000;
  left: 50%;
  bottom: 12px;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 8px 14px;
  border-radius: 999px;
  background: #f5b400;
  color: #1b1f24;
  font: 600 13px/1.3 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
}

.cms-preview-banner a {
  color: #1b1f24;
  text-decoration: underline;
}
</style>
