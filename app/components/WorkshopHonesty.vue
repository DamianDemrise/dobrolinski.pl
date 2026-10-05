<script setup lang="ts">
import { workshop } from '~/content/workshop'

const { honesty, marketing } = workshop
</script>

<template>
  <section class="workshop-section workshop-honesty" aria-labelledby="workshop-honesty-title">
    <h2 id="workshop-honesty-title" class="workshop-display reveal">
      <template v-for="line in honesty.titleLines" :key="line">
        <span class="workshop-line">{{ line }}</span>{{ ' ' }}
      </template>
    </h2>
    <div class="workshop-honesty__note reveal">
      <p class="workshop-eyebrow">{{ honesty.reference }}</p>
      <p class="workshop-honesty__text">
        <template v-for="line in honesty.lines" :key="line">
          <span class="workshop-line">{{ line }}</span>{{ ' ' }}
        </template>
      </p>
    </div>
  </section>

  <section class="workshop-section workshop-marketing" aria-labelledby="workshop-marketing-title">
    <h2 id="workshop-marketing-title" class="workshop-marketing__title reveal">
      <span class="workshop-line">{{ marketing.title }}</span>{{ ' ' }}
      <span class="workshop-line workshop-marketing__question">{{ marketing.question }}</span>
    </h2>
    <ul class="workshop-marketing__steps reveal">
      <li v-for="step in marketing.steps" :key="step">{{ step }}</li>
    </ul>
    <p class="workshop-marketing__conclusion reveal">
      <template v-for="line in marketing.conclusionLines" :key="line">
        <span class="workshop-line">{{ line }}</span>{{ ' ' }}
      </template>
    </p>
  </section>
</template>
