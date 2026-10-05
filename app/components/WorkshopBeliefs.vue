<script setup lang="ts">
import { workshop } from '~/content/workshop'

const { beliefs } = workshop
</script>

<template>
  <section class="workshop-section workshop-beliefs" aria-labelledby="workshop-beliefs-title">
    <h2 id="workshop-beliefs-title" class="workshop-eyebrow reveal">{{ beliefs.eyebrow }}</h2>
    <ul class="workshop-beliefs__list">
      <li v-for="item in beliefs.items" :key="item[0]" class="workshop-belief reveal">
        <span class="workshop-line">{{ item[0] }}</span>{{ ' ' }}
        <span class="workshop-line workshop-belief__quiet">{{ item[1] }}</span>
      </li>
    </ul>
  </section>
</template>
