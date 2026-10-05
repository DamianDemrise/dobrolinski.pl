<script setup lang="ts">
import { workshop } from '~/content/workshop'

const { noScript } = workshop
</script>

<template>
  <section class="workshop-section workshop-noscript" aria-labelledby="workshop-noscript-title">
    <h2 id="workshop-noscript-title" class="workshop-heading reveal">{{ noScript.title }}</h2>
    <ul class="workshop-quiet-list workshop-noscript__lines reveal">
      <li v-for="line in noScript.lines" :key="line">{{ line }}</li>
    </ul>
    <p class="workshop-body-strong reveal">{{ noScript.reason }}</p>
    <p class="workshop-statement reveal">{{ noScript.statement }}</p>
  </section>
</template>
