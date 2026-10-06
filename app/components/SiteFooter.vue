<script setup lang="ts">
import type { SiteFooterProps } from '~~/cms/types'
import { useCmsGlobals } from '~/cms/context'
import { vCms } from '~/cms/directive'

defineProps<{ data: SiteFooterProps }>()

const globals = useCmsGlobals()
const legal = computed(() => globals.value.site.legal)
</script>

<template>
  <div class="powered">
    <a :href="data.poweredHref" target="_blank" rel="noopener noreferrer">
      {{ ' ' }}{{ data.poweredLabel }} <strong v-cms="'poweredBrand'">{{ data.poweredBrand }}</strong>
      <span class="sr-only">{{ data.newTabNote }}</span>
    </a>
    <span class="powered__sep" aria-hidden="true">·</span>
    <NuxtLink :to="legal.privacyHref">{{ legal.privacyLabel }}</NuxtLink>
  </div>
</template>
