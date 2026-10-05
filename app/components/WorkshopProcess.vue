<script setup lang="ts">
import { workshop } from '~/content/workshop'

const { process, regularPrice, format } = workshop
</script>

<template>
  <section class="workshop-section workshop-process" aria-labelledby="workshop-process-title">
    <h2 id="workshop-process-title" class="workshop-heading reveal">{{ process.title }}</h2>
    <ol class="workshop-process__steps">
      <li v-for="step in process.steps" :key="step.id" class="workshop-step reveal">
        <h3 class="workshop-step__label">{{ step.label }}</h3>
        <div class="workshop-step__body">
          <p class="workshop-step__lead">{{ step.lead }}</p>
          <p class="workshop-step__text">
            <template v-for="line in step.lines" :key="line">
              <span class="workshop-line">{{ line }}</span>{{ ' ' }}
            </template>
          </p>
          <p v-if="step.note" class="workshop-step__text">{{ step.note }}</p>
        </div>
      </li>
    </ol>

    <div class="workshop-price reveal">
      <p class="workshop-eyebrow">{{ workshop.name }}</p>
      <p class="workshop-price__format">
        <span class="workshop-line">{{ format.type }}.</span>{{ ' ' }}
        <span class="workshop-line">{{ format.group }}.</span>
      </p>
      <p class="workshop-price__amount">{{ regularPrice.label }}</p>
      <p class="workshop-price__includes">W cenie: {{ process.priceIncludes.join(', ') }}.</p>
    </div>
  </section>
</template>
