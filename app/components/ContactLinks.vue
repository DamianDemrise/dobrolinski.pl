<script setup lang="ts">
import type { ContactLinksProps } from '~~/cms/types'
import { useCmsGlobals } from '@demrise/cms-runtime/context'
import { vCms } from '@demrise/cms-runtime/directive'

defineProps<{ data: ContactLinksProps }>()

const globals = useCmsGlobals()
const site = computed(() => globals.value.site)
</script>

<template>
  <address class="contact">
    <a v-cms="'globals.site.email'" :href="`mailto:${site.email}`" data-track="email_click" :data-track-place="data.trackPlace">{{ site.email }}</a>
    <span class="contact__separator" aria-hidden="true">·</span>
    <a v-cms="'globals.site.phoneDisplay'" :href="site.phoneHref" data-track="phone_click" :data-track-place="data.trackPlace">{{ site.phoneDisplay }}</a>
  </address>
</template>
