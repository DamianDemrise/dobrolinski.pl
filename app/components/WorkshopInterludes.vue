<script setup lang="ts">
import { workshop } from '~/content/workshop'
</script>

<template>
  <section class="workshop-section workshop-interludes" aria-label="Krótkie myśli">
    <div
      v-for="note in workshop.interludes"
      :key="note.id"
      class="workshop-interlude reveal"
      :class="`workshop-interlude--${note.id}`"
    >
      <h2 class="workshop-interlude__title">
        <template v-for="line in note.titleLines" :key="line">
          <span class="workshop-line">{{ line }}</span>{{ ' ' }}
        </template>
      </h2>
      <p class="workshop-interlude__text">
        <template v-for="line in note.lines" :key="line">
          <span class="workshop-line">{{ line }}</span>{{ ' ' }}
        </template>
      </p>
    </div>
  </section>
</template>
