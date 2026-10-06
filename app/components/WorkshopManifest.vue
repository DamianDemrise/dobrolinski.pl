<script setup lang="ts">
import type { WorkshopManifestProps } from '~~/cms/types'
import { vCms } from '~/cms/directive'

defineProps<{ data: WorkshopManifestProps }>()
</script>

<template>
  <section class="workshop-section workshop-manifest" aria-labelledby="workshop-manifest-title">
    <h2 id="workshop-manifest-title" class="workshop-manifest__title">
      <span v-cms="'quietLine'" class="workshop-line workshop-manifest__quiet reveal">{{ data.quietLine }}</span>
      <span v-cms="'strongLine'" class="workshop-line reveal">{{ data.strongLine }}</span>
    </h2>
    <p class="workshop-manifest__follow reveal">
      <template v-for="(line, i) in data.followLines" :key="line">
        <span v-cms="`followLines.${i}`" class="workshop-line">{{ line }}</span>{{ ' ' }}
      </template>
    </p>

    <div class="workshop-noscript">
      <h3 v-cms="'noScript.title'" class="workshop-heading reveal">{{ data.noScript.title }}</h3>
      <ul class="workshop-quiet-list workshop-noscript__lines reveal">
        <li v-for="(line, i) in data.noScript.lines" :key="line" v-cms="`noScript.lines.${i}`">{{ line }}</li>
      </ul>
      <p v-cms="'noScript.reason'" class="workshop-body-strong reveal">{{ data.noScript.reason }}</p>
      <p v-cms="'noScript.statement'" class="workshop-statement reveal">{{ data.noScript.statement }}</p>
    </div>
  </section>
</template>
