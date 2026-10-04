<script setup lang="ts">
import type { AreaSlug } from '~/content/site'
import { siteContent } from '~/content/site'

defineProps<{
  activeArea: AreaSlug | null
  thought: string
}>()

const emit = defineEmits<{
  activateArea: [slug: AreaSlug]
  leaveArea: []
  openWorkshop: []
  previewArea: [slug: AreaSlug]
}>()
</script>

<template>
  <section class="view home-view" aria-labelledby="site-title" tabindex="-1">
    <CurrentProjectLink @open="emit('openWorkshop')" />

    <div class="identity">
      <p class="identity__eyebrow" aria-hidden="true">DD / 01</p>
      <h1 id="site-title" class="name">{{ siteContent.name }}</h1>
      <ExpertiseNav
        :active-area="activeArea"
        :areas="siteContent.areas"
        @activate="emit('activateArea', $event)"
        @leave="emit('leaveArea')"
        @preview="emit('previewArea', $event)"
      />
      <ThoughtDisplay :thought="thought" />
      <ContactLinks />
    </div>

    <div class="powered">
      <a href="https://demrise.pl" target="_blank" rel="noopener noreferrer">
        Powered by <strong>DEMRISE</strong>
        <span class="sr-only">(otwiera nową kartę)</span>
      </a>
    </div>
  </section>
</template>
