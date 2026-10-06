<script setup lang="ts">
import type { HomeStageProps } from '~~/cms/types'
import { useCmsGlobals } from '~/cms/context'
import { vCms } from '~/cms/directive'

defineOptions({ inheritAttrs: false })
defineProps<{ data: HomeStageProps }>()

const globals = useCmsGlobals()
const site = computed(() => globals.value.site)
const { activeArea, leaveArea, previewArea, thought, toggleArea } = useSiteExperience(
  () => site.value.areas,
  () => site.value.thoughts,
)
</script>

<template>
  <h1 id="site-title" v-cms="'globals.site.name'" class="name" :class="$attrs.class">{{ site.name }}</h1>
  <ExpertiseNav
    :class="$attrs.class"
    :active-area="activeArea"
    :areas="site.areas"
    :label="data.navLabel"
    @activate="toggleArea"
    @leave="leaveArea"
    @preview="previewArea"
  />
  <ThoughtDisplay :class="$attrs.class" :thought="thought" />
</template>
