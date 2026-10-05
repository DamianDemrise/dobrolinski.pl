<script setup lang="ts">
import { workshop } from '~/content/workshop'

const { noScript } = workshop
</script>

<template>
  <section class="workshop-section workshop-split" aria-labelledby="workshop-noscript-title">
    <h2 id="workshop-noscript-title" class="workshop-heading reveal">{{ noScript.title }}</h2>
    <div class="workshop-split__body">
      <ul class="workshop-quiet-list reveal">
        <li v-for="line in noScript.lines" :key="line">{{ line }}</li>
      </ul>
      <p class="workshop-body-strong reveal">{{ noScript.reason }}</p>
      <p class="workshop-statement reveal">{{ noScript.statement }}</p>
    </div>
  </section>
</template>
