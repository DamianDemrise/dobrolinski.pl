<script setup lang="ts">
import { workshop } from '~/content/workshop'

const { manifest, noScript } = workshop
</script>

<template>
  <section class="workshop-section workshop-manifest" aria-labelledby="workshop-manifest-title">
    <h2 id="workshop-manifest-title" class="workshop-manifest__title">
      <span class="workshop-line workshop-manifest__quiet reveal">{{ manifest.quietLine }}</span>
      <span class="workshop-line reveal">{{ manifest.strongLine }}</span>
    </h2>
    <p class="workshop-manifest__follow reveal">
      <template v-for="line in manifest.followLines" :key="line">
        <span class="workshop-line">{{ line }}</span>{{ ' ' }}
      </template>
    </p>

    <div class="workshop-noscript">
      <h3 class="workshop-heading reveal">{{ noScript.title }}</h3>
      <ul class="workshop-quiet-list workshop-noscript__lines reveal">
        <li v-for="line in noScript.lines" :key="line">{{ line }}</li>
      </ul>
      <p class="workshop-body-strong reveal">{{ noScript.reason }}</p>
      <p class="workshop-statement reveal">{{ noScript.statement }}</p>
    </div>
  </section>
</template>
