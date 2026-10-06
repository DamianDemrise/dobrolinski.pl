<script setup lang="ts">
import type { WorkshopProcessProps } from '~~/cms/types'
import { useCmsGlobals } from '@demrise/cms-runtime/context'
import { vCms } from '@demrise/cms-runtime/directive'

defineProps<{ data: WorkshopProcessProps }>()

const globals = useCmsGlobals()
const workshop = computed(() => globals.value.workshop)
</script>

<template>
  <section class="workshop-section workshop-process" aria-labelledby="workshop-process-title">
    <h2 id="workshop-process-title" v-cms="'title'" class="workshop-heading reveal">{{ data.title }}</h2>
    <ol class="workshop-process__steps">
      <li v-for="(step, s) in data.steps" :key="step._id" class="workshop-step reveal">
        <h3 v-cms="`steps.${s}.label`" class="workshop-step__label">{{ step.label }}</h3>
        <div class="workshop-step__body">
          <p v-cms="`steps.${s}.lead`" class="workshop-step__lead">{{ step.lead }}</p>
          <p class="workshop-step__text">
            <template v-for="(line, i) in step.lines" :key="line">
              <span v-cms="`steps.${s}.lines.${i}`" class="workshop-line">{{ line }}</span>{{ ' ' }}
            </template>
          </p>
          <p v-if="step.note" v-cms="`steps.${s}.note`" class="workshop-step__text">{{ step.note }}</p>
        </div>
      </li>
    </ol>

    <div class="workshop-rules reveal">
      <h3 v-cms="'groundRules.eyebrow'" class="workshop-eyebrow">{{ data.groundRules.eyebrow }}</h3>
      <p v-for="(item, r) in data.groundRules.items" :key="item._id" class="workshop-rules__item">
        <template v-for="(line, i) in item.lines" :key="line">
          <span v-cms="`groundRules.items.${r}.lines.${i}`" class="workshop-line">{{ line }}</span>{{ ' ' }}
        </template>
      </p>
    </div>

    <div class="workshop-price reveal">
      <p v-cms="'globals.workshop.name'" class="workshop-eyebrow">{{ workshop.name }}</p>
      <p class="workshop-price__format">
        <span v-cms="'globals.workshop.format.type'" class="workshop-line">{{ workshop.format.type }}.</span>{{ ' ' }}
        <span v-cms="'globals.workshop.format.group'" class="workshop-line">{{ workshop.format.group }}.</span>
      </p>
      <p v-cms="'globals.workshop.regularPrice.label'" class="workshop-price__amount">{{ workshop.regularPrice.label }}</p>
      <p class="workshop-price__includes">{{ data.priceIncludesLabel }} {{ workshop.priceIncludes.join(', ') }}.</p>
    </div>
  </section>
</template>
