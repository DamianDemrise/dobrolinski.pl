<script setup lang="ts">
import { siteContent } from '~/content/site'

const { program } = siteContent.workshop
</script>

<template>
  <section class="workshop-section workshop-program" aria-labelledby="workshop-program-title">
    <h2 id="workshop-program-title" class="workshop-eyebrow reveal">{{ program.eyebrow }}</h2>
    <ol class="workshop-program__list">
      <li v-for="topic in program.topics" :key="topic.number" class="workshop-topic reveal">
        <span class="workshop-topic__number" aria-hidden="true">{{ topic.number }}</span>
        <h3 class="workshop-topic__title">
          <template v-for="line in topic.titleLines" :key="line">
            <span class="workshop-line">{{ line }}</span>{{ ' ' }}
          </template>
        </h3>
        <p class="workshop-topic__text">{{ topic.text }}</p>
      </li>
    </ol>
  </section>
</template>
