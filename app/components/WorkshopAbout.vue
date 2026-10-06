<script setup lang="ts">
import type { WorkshopAboutProps } from '~~/cms/types'
import { vCms } from '@demrise/cms-runtime/directive'

defineProps<{ data: WorkshopAboutProps }>()
</script>

<template>
  <section class="workshop-section workshop-about" aria-labelledby="workshop-about-title">
    <h2 id="workshop-about-title" class="workshop-about__title reveal">
      <template v-for="(line, i) in data.titleLines" :key="line">
        <span v-cms="`titleLines.${i}`" class="workshop-line">{{ line }}</span>{{ ' ' }}
      </template>
    </h2>
    <div class="workshop-about__body">
      <p v-for="(paragraph, p) in data.paragraphs" :key="paragraph._id" class="reveal">
        <template v-for="(line, i) in paragraph.lines" :key="line">
          <span v-cms="`paragraphs.${p}.lines.${i}`" class="workshop-line">{{ line }}</span>{{ ' ' }}
        </template>
      </p>
    </div>
  </section>
</template>
