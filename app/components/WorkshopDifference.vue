<script setup lang="ts">
import { siteContent } from '~/content/site'

const { difference } = siteContent.workshop
</script>

<template>
  <section class="workshop-section workshop-difference" aria-labelledby="workshop-difference-title">
    <h2 id="workshop-difference-title" class="workshop-heading reveal">{{ difference.title }}</h2>
    <div class="workshop-difference__body reveal">
      <ul class="workshop-difference__list">
        <li v-for="line in difference.notLines" :key="line">{{ line }}</li>
      </ul>
      <p class="workshop-difference__text">{{ difference.text }}</p>
    </div>
  </section>
</template>
