<script setup lang="ts">
import type { AreaItem } from '~~/cms/types'
import { vCms } from '@demrise/cms-runtime/directive'

defineProps<{
  activeArea: string | null
  areas: readonly AreaItem[]
  label: string
}>()

const emit = defineEmits<{
  activate: [slug: string]
  leave: []
  preview: [slug: string]
}>()
</script>

<template>
  <nav class="areas" :aria-label="label">
    <template v-for="(area, index) in areas" :key="area.slug">
      <button
        v-cms="`globals.site.areas.${index}.label`"
        class="area"
        :class="{ 'area--active': activeArea === area.slug }"
        type="button"
        :aria-pressed="activeArea === area.slug"
        @mouseenter="emit('preview', area.slug)"
        @mouseleave="emit('leave')"
        @focus="emit('preview', area.slug)"
        @blur="emit('leave')"
        @click="emit('activate', area.slug)"
      >
        {{ area.label }}
      </button>
      <span v-if="index < areas.length - 1" class="area-separator" aria-hidden="true">·</span>
    </template>
  </nav>
</template>
