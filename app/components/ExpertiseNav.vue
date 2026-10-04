<script setup lang="ts">
import type { Area, AreaSlug } from '~/content/site'

defineProps<{
  activeArea: AreaSlug | null
  areas: readonly Area[]
}>()

const emit = defineEmits<{
  activate: [slug: AreaSlug]
  leave: []
  preview: [slug: AreaSlug]
}>()
</script>

<template>
  <nav class="areas" aria-label="Obszary doświadczenia">
    <template v-for="(area, index) in areas" :key="area.slug">
      <button
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
