<script setup lang="ts">
import type { PageDocument } from '@demrise/cms-core'
import { onBeforeUnmount, onMounted } from 'vue'
import CmsBlocks from '@demrise/cms-runtime/CmsBlocks'

defineProps<{ page: PageDocument }>()

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') navigateTo('/')
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <section class="view workshop-view ebook-view" aria-labelledby="ebook-title" tabindex="-1">
    <div class="ebook">
      <CmsBlocks :page="page" region="ebook" />
    </div>

    <CmsBlocks :page="page" region="back" />
  </section>
</template>
