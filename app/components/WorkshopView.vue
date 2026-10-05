<script setup lang="ts">
import { ref } from 'vue'

defineEmits<{ close: [] }>()

const root = ref<HTMLElement | null>(null)
const content = ref<HTMLElement | null>(null)

useReveal(root)

const showContent = () => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  content.value?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
}
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
      <WorkshopApproach />
      <WorkshopDifference />
      <WorkshopProgram />
      <WorkshopClosing />
    </div>

    <div class="workshop-fade" aria-hidden="true" />

    <button class="back-button" type="button" @click="$emit('close')">
      <span aria-hidden="true">←</span> Wróć
    </button>
  </section>
</template>
