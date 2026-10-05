<script setup lang="ts">
import { workshop } from '~/content/workshop'

const { question } = workshop
</script>

<template>
  <section class="workshop-section workshop-question" aria-labelledby="workshop-question-title">
    <h2 id="workshop-question-title" class="workshop-question__prompt reveal">
      <template v-for="line in question.promptLines" :key="line">
        <span class="workshop-line">{{ line }}</span>{{ ' ' }}
      </template>
      <span class="workshop-line workshop-question__quote">{{ question.quote }}</span>
    </h2>
    <p class="workshop-question__answer reveal">
      <span class="workshop-line workshop-question__intro">{{ question.answerIntro }}</span>{{ ' ' }}
      <span class="workshop-line">{{ question.answer }}</span>
    </p>
  </section>
</template>
