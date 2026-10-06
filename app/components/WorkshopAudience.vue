<script setup lang="ts">
import type { WorkshopAudienceProps } from '~~/cms/types'
import { vCms } from '~/cms/directive'

defineProps<{ data: WorkshopAudienceProps }>()
</script>

<template>
  <section class="workshop-section workshop-audience" aria-labelledby="workshop-audience-title">
    <p v-cms="'eyebrow'" class="workshop-eyebrow reveal">{{ data.eyebrow }}</p>
    <h2 id="workshop-audience-title" class="workshop-audience__title reveal">
      <template v-for="(line, i) in data.titleLines" :key="line">
        <span v-cms="`titleLines.${i}`" class="workshop-line">{{ line }}</span>{{ ' ' }}
      </template>
    </h2>
    <ul class="workshop-people">
      <li v-for="(person, i) in data.people" :key="person" v-cms="`people.${i}`" class="reveal">{{ person }}</li>
    </ul>
    <p class="workshop-quiet-list workshop-audience__details reveal">
      <template v-for="(line, i) in data.detailsLines" :key="line">
        <span v-cms="`detailsLines.${i}`" class="workshop-line">{{ line }}</span>{{ ' ' }}
      </template>
    </p>
  </section>
</template>
