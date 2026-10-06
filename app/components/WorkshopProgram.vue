<script setup lang="ts">
import type { WorkshopProgramProps } from '~~/cms/types'
import { vCms } from '~/cms/directive'

defineProps<{ data: WorkshopProgramProps }>()
</script>

<template>
  <section class="workshop-section workshop-program" aria-labelledby="workshop-program-title">
    <h2 id="workshop-program-title" v-cms="'eyebrow'" class="workshop-eyebrow reveal">{{ data.eyebrow }}</h2>
    <ol class="workshop-program__list">
      <li v-for="(topic, t) in data.topics" :key="topic._id" class="workshop-topic reveal">
        <span v-cms="`topics.${t}.number`" class="workshop-topic__number" aria-hidden="true">{{ topic.number }}</span>
        <h3 class="workshop-topic__title">
          <template v-for="(line, i) in topic.titleLines" :key="line">
            <span v-cms="`topics.${t}.titleLines.${i}`" class="workshop-line">{{ line }}</span>{{ ' ' }}
          </template>
        </h3>
        <p class="workshop-topic__text">
          <template v-for="(line, i) in topic.textLines" :key="line">
            <span v-cms="`topics.${t}.textLines.${i}`" class="workshop-line">{{ line }}</span>{{ ' ' }}
          </template>
        </p>
      </li>
    </ol>
  </section>
</template>
