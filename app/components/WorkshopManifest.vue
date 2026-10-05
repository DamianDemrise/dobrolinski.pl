<script setup lang="ts">
import { workshop } from '~/content/workshop'

const { manifest } = workshop
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
  </section>
</template>
