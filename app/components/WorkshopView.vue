<script setup lang="ts">
import { siteContent } from '~/content/site'

defineEmits<{ close: [] }>()
</script>

<template>
  <section class="view workshop-view" aria-labelledby="workshop-title" tabindex="-1">
    <div class="workshop">
      <p class="workshop__eyebrow">{{ siteContent.workshop.eyebrow }}</p>
      <h2 id="workshop-title" class="workshop__title">
        {{ siteContent.workshop.title }}
      </h2>
      <p class="workshop__description">{{ siteContent.workshop.description }}</p>
      <p class="workshop__statement">{{ siteContent.workshop.statement }}</p>
      <a class="workshop__cta" :href="`mailto:${siteContent.email}?subject=Warsztat%20CZŁOWIEK`">
        {{ siteContent.email }} <span aria-hidden="true">→</span>
      </a>
    </div>

    <button class="back-button" type="button" @click="$emit('close')">
      <span aria-hidden="true">←</span> WRÓĆ
    </button>
  </section>
</template>
