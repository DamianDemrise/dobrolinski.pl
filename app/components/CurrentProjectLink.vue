<script setup lang="ts">
import { workshop } from '~/content/workshop'
</script>

<template>
  <NuxtLink class="current-project" :to="workshop.path" data-track="home-project">
    <span class="current-project__label">{{ workshop.homeLabel }}</span>
    <span class="current-project__name">{{ workshop.index }}</span>
    <span class="current-project__lead">{{ workshop.hero.lead }}</span>
    <span class="current-project__arrow" aria-hidden="true">→</span>
  </NuxtLink>
</template>
