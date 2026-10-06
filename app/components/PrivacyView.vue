<script setup lang="ts">
import type { PageDocument } from '@demrise/cms-core'
import { onBeforeUnmount, onMounted } from 'vue'
import CmsBlocks from '~/cms/CmsBlocks'

defineProps<{ page: PageDocument }>()

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') navigateTo('/')
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <section class="view workshop-view privacy-view" aria-labelledby="privacy-title" tabindex="-1">
    <CmsBlocks :page="page" region="main" />

    <CmsBlocks :page="page" region="back" />
  </section>
</template>
