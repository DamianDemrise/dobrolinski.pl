<script setup lang="ts">
import type { WorkshopBeliefsProps } from '~~/cms/types'
import { vCms } from '~/cms/directive'

defineProps<{ data: WorkshopBeliefsProps }>()
</script>

<template>
  <section class="workshop-section workshop-beliefs" aria-labelledby="workshop-beliefs-title">
    <h2 id="workshop-beliefs-title" v-cms="'eyebrow'" class="workshop-eyebrow reveal">{{ data.eyebrow }}</h2>
    <ul class="workshop-beliefs__list">
      <li v-for="(item, i) in data.items" :key="item._id" class="workshop-belief reveal">
        <span v-cms="`items.${i}.line`" class="workshop-line">{{ item.line }}</span>{{ ' ' }}
        <span v-cms="`items.${i}.quiet`" class="workshop-line workshop-belief__quiet">{{ item.quiet }}</span>
      </li>
    </ul>
  </section>
</template>
