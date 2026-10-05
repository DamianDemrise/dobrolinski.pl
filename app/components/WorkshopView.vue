<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const root = ref<HTMLElement | null>(null)
const content = ref<HTMLElement | null>(null)

useReveal(root)

const showContent = () => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  content.value?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
}

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
    <WorkshopHero @more="showContent" />

    <div ref="content" class="workshop-content">
      <WorkshopManifest />
      <WorkshopNoScript />
      <WorkshopProgram />
      <WorkshopAbout />
      <WorkshopAudience />
      <WorkshopClosing />
    </div>

    <div class="workshop-fade" aria-hidden="true" />

    <NuxtLink class="back-button" to="/" data-track="back-home" data-track-place="back">
      <span aria-hidden="true">←</span> Wróć
    </NuxtLink>
  </section>
</template>
