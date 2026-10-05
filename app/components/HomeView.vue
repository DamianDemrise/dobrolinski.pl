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
  previewArea: [slug: AreaSlug]
}>()
</script>

<template>
  <section class="view home-view" aria-labelledby="site-title" tabindex="-1">
    <div class="identity">
      <h1 id="site-title" class="name">{{ siteContent.name }}</h1>
      <ExpertiseNav
        :active-area="activeArea"
        :areas="siteContent.areas"
        @activate="emit('activateArea', $event)"
        @leave="emit('leaveArea')"
        @preview="emit('previewArea', $event)"
      />
      <ThoughtDisplay :thought="thought" />
      <CurrentProjectLink />
      <ContactLinks />
    </div>

    <div class="powered">
      <a href="https://demrise.pl" target="_blank" rel="noopener noreferrer">
        Powered by <strong>DEMRISE</strong>
        <span class="sr-only">(otwiera nową kartę)</span>
      </a>
      <span class="powered__sep" aria-hidden="true">·</span>
      <NuxtLink to="/polityka-prywatnosci">Polityka prywatności</NuxtLink>
    </div>
  </section>
</template>
