<script setup lang="ts">
import type { PageDocument } from '@demrise/cms-core'
import { onBeforeUnmount, onMounted, provide, ref } from 'vue'
import CmsBlocks from '@demrise/cms-runtime/CmsBlocks'
import { useCmsEditContext } from '@demrise/cms-runtime/context'
import { BACK_LINK_TRAILING_SPACE, WORKSHOP_SHOW_CONTENT } from '~/composables/useWorkshopNav'

defineProps<{ page: PageDocument }>()

const root = ref<HTMLElement | null>(null)
const content = ref<HTMLElement | null>(null)

// W edytorze treść jest widoczna od razu (bloki dochodzą i znikają w trakcie edycji).
if (!useCmsEditContext()) useReveal(root)
const progress = useScrollProgress(root)

const showContent = () => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  content.value?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
}
provide(WORKSHOP_SHOW_CONTENT, showContent)
provide(BACK_LINK_TRAILING_SPACE, true)

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') navigateTo('/')
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <section
    ref="root"
    class="view workshop-view"
    aria-labelledby="workshop-title"
    tabindex="-1"
  >
    <CmsBlocks :page="page" region="hero" />

    <div ref="content" class="workshop-content">
      <CmsBlocks :page="page" region="main" />
    </div>

    <div class="workshop-fade" aria-hidden="true" />
    <div
      class="workshop-progress"
      :class="{ 'is-active': progress > 0.002 }"
      :style="{ '--progress': progress }"
      aria-hidden="true"
    />

    <CmsBlocks :page="page" region="back" />
  </section>
</template>
