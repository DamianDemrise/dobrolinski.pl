<script setup lang="ts">
import { linkSegments } from '~~/cms/derive'
import type { EbookFormProps } from '~~/cms/types'
import { vCms } from '~/cms/directive'

defineProps<{ data: EbookFormProps }>()

const isExternal = (href: string) => href.startsWith('http')
</script>

<template>
  <!-- Ten sam formularz co oferta warsztatu (logika, pułapka na boty, pomiar); wysyła product: 'ebook'. -->
  <ClientOnly>
    <WorkshopOfferForm :offer="data" product="ebook" cms-path="">
      <template #note>
        <span v-cms="'consent'">
          <template v-for="(part, i) in linkSegments(data.consent)" :key="i">
            <template v-if="typeof part === 'string'">{{ part }}</template>
            <a
              v-else-if="isExternal(part.href)"
              :href="part.href"
              target="_blank"
              rel="noopener noreferrer"
            >{{ part.label }}</a>
            <NuxtLink v-else :to="part.href">{{ part.label }}</NuxtLink>
          </template>
        </span>
      </template>
    </WorkshopOfferForm>
  </ClientOnly>
</template>
