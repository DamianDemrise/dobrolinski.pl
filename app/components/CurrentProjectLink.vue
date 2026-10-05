<script setup lang="ts">
import { siteContent } from '~/content/site'

defineEmits<{ open: [] }>()

const { workshop } = siteContent
</script>

<template>
  <button class="current-project" type="button" @click="$emit('open')">
    <span class="current-project__label">
      {{ workshop.homeLabel }}
      <span class="current-project__line" aria-hidden="true" />
    </span>
    <span class="current-project__name">
      {{ workshop.index }}
      <span class="current-project__arrow" aria-hidden="true">→</span>
    </span>
    <span class="current-project__lead">{{ workshop.lead }}</span>
  </button>
</template>
