<script setup lang="ts">
import { inject } from 'vue'
import type { BackLinkProps } from '~~/cms/types'
import { BACK_LINK_TRAILING_SPACE } from '~/composables/useWorkshopNav'

defineProps<{ data: BackLinkProps }>()

const trailing = inject(BACK_LINK_TRAILING_SPACE, false) ? ' ' : ''
</script>

<template>
  <NuxtLink class="back-button" :to="data.href" data-track="back_home" :data-track-place="data.trackPlace">
    <span aria-hidden="true">←</span> {{ data.label }}{{ trailing }}
  </NuxtLink>
</template>
