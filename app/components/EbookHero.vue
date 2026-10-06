<script setup lang="ts">
import type { EbookHeroProps } from '~~/cms/types'
import { vCms } from '@demrise/cms-runtime/directive'

defineProps<{ data: EbookHeroProps }>()
</script>

<template>
  <header class="ebook-hero">
    <p v-cms="'eyebrow'" class="workshop-eyebrow">{{ data.eyebrow }}</p>
    <h1 id="ebook-title" class="ebook-hero__title">
      <template v-for="(line, i) in data.titleLines" :key="line">
        <span v-cms="`titleLines.${i}`" class="workshop-line">{{ line }}</span>{{ ' ' }}
      </template>
    </h1>
    <div v-if="data.leadLines.length" class="ebook-hero__lead">
      <p v-for="(line, i) in data.leadLines" :key="line" v-cms="`leadLines.${i}`">{{ line }}</p>
    </div>
  </header>
</template>
