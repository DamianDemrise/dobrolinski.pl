<script setup lang="ts">
import { workshop } from '~/content/workshop'

const { audience } = workshop
</script>

<template>
  <section class="workshop-section workshop-audience" aria-labelledby="workshop-audience-title">
    <p class="workshop-eyebrow reveal">{{ audience.eyebrow }}</p>
    <h2 id="workshop-audience-title" class="workshop-audience__title reveal">
      <template v-for="line in audience.titleLines" :key="line">
        <span class="workshop-line">{{ line }}</span>{{ ' ' }}
      </template>
    </h2>
    <ul class="workshop-people">
      <li v-for="person in audience.people" :key="person" class="reveal">{{ person }}</li>
    </ul>
    <p class="workshop-quiet-list workshop-audience__details reveal">
      <template v-for="line in audience.detailsLines" :key="line">
        <span class="workshop-line">{{ line }}</span>{{ ' ' }}
      </template>
    </p>
  </section>
</template>
