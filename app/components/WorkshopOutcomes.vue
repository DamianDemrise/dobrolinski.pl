<script setup lang="ts">
import { workshop } from '~/content/workshop'

const { outcomes } = workshop
</script>

<template>
  <section class="workshop-section workshop-outcomes" aria-labelledby="workshop-outcomes-title">
    <h2 id="workshop-outcomes-title" class="workshop-outcomes__intro reveal">{{ outcomes.intro }}</h2>
    <ul class="workshop-outcomes__list">
      <li v-for="item in outcomes.items" :key="item[0]" class="reveal">
        <template v-for="line in item" :key="line">
          <span class="workshop-line">{{ line }}</span>{{ ' ' }}
        </template>
      </li>
    </ul>
    <p class="workshop-outcomes__conclusion reveal">{{ outcomes.conclusion }}</p>
  </section>
</template>
