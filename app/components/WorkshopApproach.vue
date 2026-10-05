<script setup lang="ts">
import { siteContent } from '~/content/site'

const { approach } = siteContent.workshop
</script>

<template>
  <section class="workshop-section workshop-approach" aria-labelledby="workshop-approach-title">
    <h2 id="workshop-approach-title" class="workshop-approach__title reveal">
      <template v-for="line in approach.titleLines" :key="line">
        <span class="workshop-line">{{ line }}</span>{{ ' ' }}
      </template>
    </h2>
    <p class="workshop-approach__follow reveal">
      <template v-for="line in approach.followLines" :key="line">
        <span class="workshop-line">{{ line }}</span>{{ ' ' }}
      </template>
    </p>
  </section>
</template>
