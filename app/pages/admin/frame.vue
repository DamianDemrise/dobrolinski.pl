<!--
  Canvas edytora (ładowany w iframe przez /admin/edit/:id). Renderuje prawdziwą stronę przez
  CmsPageView w publicznym wrapperze (main.site-stage), z CMS_EDIT_CONTEXT zasilanym
  wiadomościami od rodzica (ten sam origin). Sam nie rozmawia z API.
-->
<script setup lang="ts">
import { adminAuth } from '~/admin/auth-guard'
import type { Device, PageDocument } from '@demrise/cms-core'
import type { Ref } from 'vue'
import { nextTick, onBeforeUnmount, onMounted, provide, ref, shallowRef } from 'vue'
import '~/admin/frame.css'
import { createCanvasController } from '~/admin/editor/canvas-dom'
import type { FrameMessage, FrameState } from '~/admin/editor/protocol'
import { isParentMessage } from '~/admin/editor/protocol'
import CmsPageView from '~/cms/CmsPageView'
import type { CmsSiteData } from '~/cms/context'
import { CMS_EDIT_CONTEXT } from '~/cms/context'

definePageMeta({ middleware: [adminAuth] })
useHead({ title: 'Canvas', htmlAttrs: { class: 'cms-editing' }, meta: [{ name: 'robots', content: 'noindex' }] })

const page = shallowRef<PageDocument | null>(null)
const site = shallowRef<CmsSiteData | null>(null)
const showHidden = ref(true)
const device = ref<Device>('desktop')
let state: FrameState | null = null
let pending: FrameState | null = null

// page/site są ustawione, zanim CmsPageView się wyrenderuje (v-if niżej).
provide(CMS_EDIT_CONTEXT, { page: page as Ref<PageDocument>, site: site as Ref<CmsSiteData>, showHidden, device })

const inFrame = window.parent !== window
const post = (message: FrameMessage) => {
  if (inFrame) window.parent.postMessage(message, location.origin)
}

const canvas = createCanvasController({
  post,
  getState: () => state,
  onEditEnd: () => {
    if (pending) {
      const next = pending
      pending = null
      apply(next)
    }
  },
})

async function apply(next: FrameState) {
  state = next
  page.value = next.page
  site.value = next.site
  showHidden.value = next.showHidden
  device.value = next.device
  await nextTick()
  canvas.mark(next.selection, next.page)
  // Bloki oznaczają korzenie w onMounted/onUpdated; po klatce obrys trafia też na nowe elementy.
  requestAnimationFrame(() => {
    if (state === next) canvas.mark(next.selection, next.page)
  })
}

function onMessage(event: MessageEvent) {
  if (event.origin !== location.origin || event.source !== window.parent || !isParentMessage(event.data)) return
  const message = event.data
  if (message.type === 'cms:state') {
    // W trakcie edycji tekstu nie podmieniamy DOM (kursor); stan wchodzi po zakończeniu.
    if (canvas.isEditing()) {
      pending = message.state
      canvas.markSelection(message.state.selection)
    }
    else void apply(message.state)
  }
  else if (message.type === 'cms:scroll-to') {
    canvas.scrollTo(message.target)
  }
}

onMounted(() => {
  window.addEventListener('message', onMessage)
  canvas.install()
  // Canvas nie zmienia adresu (linki NuxtLink, Esc w widokach).
  useRouter().beforeEach(to => to.path === '/admin/frame')
  post({ type: 'cms:ready' })
})
onBeforeUnmount(() => window.removeEventListener('message', onMessage))
</script>

<template>
  <main class="site-stage has-navigated">
    <div class="ambient-light" aria-hidden="true" />
    <CmsPageView v-if="page && site" :page="page" />
  </main>
</template>
