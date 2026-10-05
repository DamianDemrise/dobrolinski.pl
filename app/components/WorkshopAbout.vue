<script setup lang="ts">
import { workshop } from '~/content/workshop'

const { about } = workshop
</script>

<template>
  <section class="workshop-section workshop-about" aria-labelledby="workshop-about-title">
    <h2 id="workshop-about-title" class="workshop-about__title reveal">
      <template v-for="line in about.titleLines" :key="line">
        <span class="workshop-line">{{ line }}</span>{{ ' ' }}
      </template>
    </h2>
    <div class="workshop-about__body">
      <p v-for="paragraph in about.paragraphs" :key="paragraph[0]" class="reveal">
        <template v-for="line in paragraph" :key="line">
          <span class="workshop-line">{{ line }}</span>{{ ' ' }}
        </template>
      </p>
    </div>
  </section>
</template>
