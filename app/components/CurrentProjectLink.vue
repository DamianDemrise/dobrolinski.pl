<script setup lang="ts">
import { projectIndex } from '~~/cms/derive'
import type { CurrentProjectProps } from '~~/cms/types'
import { useCmsGlobals } from '~/cms/context'
import { vCms } from '~/cms/directive'

defineProps<{ data: CurrentProjectProps }>()

const globals = useCmsGlobals()
const workshop = computed(() => globals.value.workshop)
</script>

<template>
  <NuxtLink class="current-project" :to="workshop.path" data-track="open_project">
    <span v-cms="'label'" class="current-project__label">{{ data.label }}</span>
    <span v-cms="'globals.workshop.name'" class="current-project__name">{{ projectIndex(workshop) }}</span>
    <span v-cms="'lead'" class="current-project__lead">{{ data.lead }}</span>
    <span class="current-project__arrow" aria-hidden="true">→</span>
  </NuxtLink>
</template>
