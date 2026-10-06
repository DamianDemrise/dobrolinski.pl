<script setup lang="ts">
import type { PageDocument } from '@demrise/cms-core'
import CmsBlocks from '~/cms/CmsBlocks'

defineProps<{ page: PageDocument }>()
</script>

<template>
  <section class="view home-view" aria-labelledby="site-title" tabindex="-1">
    <div class="identity">
      <CmsBlocks :page="page" region="identity" />
    </div>

    <CmsBlocks :page="page" region="footer" />
  </section>
</template>
