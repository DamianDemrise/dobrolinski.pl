<script setup lang="ts">
import { workshop } from '~/content/workshop'

const { groundRules, workshopParts, yourStories } = workshop
</script>

<template>
  <section class="workshop-section workshop-rules" aria-labelledby="workshop-rules-title">
    <h2 id="workshop-rules-title" class="workshop-eyebrow reveal">{{ groundRules.eyebrow }}</h2>
    <p v-for="item in groundRules.items" :key="item[0]" class="workshop-rules__item reveal">
      <template v-for="line in item" :key="line">
        <span class="workshop-line">{{ line }}</span>{{ ' ' }}
      </template>
    </p>
  </section>

  <section class="workshop-section workshop-parts" aria-label="Części warsztatu">
    <ol class="workshop-parts__list">
      <li v-for="part in workshopParts" :key="part.number" class="workshop-part reveal">
        <h3 class="workshop-part__name">{{ part.number }} / {{ part.name }}</h3>
        <p class="workshop-part__lines">
          <template v-for="line in part.lines" :key="line">
            <span class="workshop-line">{{ line }}</span>{{ ' ' }}
          </template>
        </p>
        <p v-if="part.closing" class="workshop-part__closing">{{ part.closing }}</p>
      </li>
    </ol>
  </section>

  <section class="workshop-section workshop-stories" aria-labelledby="workshop-stories-title">
    <h2 id="workshop-stories-title" class="workshop-stories__title">
      <span class="workshop-line workshop-stories__quiet reveal">{{ yourStories.quietLine }}</span>{{ ' ' }}
      <span class="workshop-line reveal">{{ yourStories.strongLine }}</span>
    </h2>
    <p class="workshop-eyebrow workshop-stories__caption reveal">{{ yourStories.caption }}</p>
    <ul class="workshop-stories__list">
      <li v-for="situation in yourStories.situations" :key="situation[0]" class="reveal">
        <template v-for="line in situation" :key="line">
          <span class="workshop-line">{{ line }}</span>{{ ' ' }}
        </template>
      </li>
    </ul>
  </section>
</template>
