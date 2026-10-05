<script setup lang="ts">
import { currentProject, projectLabel } from '~/content/projects'
import { workshop } from '~/content/workshop'
</script>

<template>
  <NuxtLink class="current-project" :to="currentProject.path" data-track="open_project">
    <span class="current-project__label">{{ workshop.homeLabel }}</span>
    <span class="current-project__name">{{ projectLabel(currentProject) }}</span>
    <span class="current-project__lead">{{ currentProject.lead }}</span>
    <span class="current-project__arrow" aria-hidden="true">→</span>
  </NuxtLink>
</template>
