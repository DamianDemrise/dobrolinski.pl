<script setup lang="ts">
import type { WorkshopPartsProps } from '~~/cms/types'
import { vCms } from '~/cms/directive'

// Dwa korzenie: klasy widoczności z CMS trafiają na oba.
defineOptions({ inheritAttrs: false })
defineProps<{ data: WorkshopPartsProps }>()
</script>

<template>
  <section class="workshop-section workshop-parts" :class="$attrs.class" :aria-label="data.ariaLabel">
    <ol class="workshop-parts__list">
      <li v-for="(part, p) in data.parts" :key="part._id" class="workshop-part reveal">
        <h3 class="workshop-part__name">{{ part.number }} / {{ part.name }}</h3>
        <p class="workshop-part__lines">
          <template v-for="(line, i) in part.lines" :key="line">
            <span v-cms="`parts.${p}.lines.${i}`" class="workshop-line">{{ line }}</span>{{ ' ' }}
          </template>
        </p>
        <p v-if="part.closing" v-cms="`parts.${p}.closing`" class="workshop-part__closing">{{ part.closing }}</p>
      </li>
    </ol>
  </section>

  <section class="workshop-section workshop-stories" :class="$attrs.class" aria-labelledby="workshop-stories-title">
    <h2 id="workshop-stories-title" class="workshop-stories__title">
      <span v-cms="'stories.quietLine'" class="workshop-line workshop-stories__quiet reveal">{{ data.stories.quietLine }}</span>{{ ' ' }}
      <span v-cms="'stories.strongLine'" class="workshop-line reveal">{{ data.stories.strongLine }}</span>
    </h2>
    <p v-cms="'stories.caption'" class="workshop-eyebrow workshop-stories__caption reveal">{{ data.stories.caption }}</p>
    <ul class="workshop-stories__list">
      <li v-for="(situation, s) in data.stories.situations" :key="situation._id" class="reveal">
        <template v-for="(line, i) in situation.lines" :key="line">
          <span v-cms="`stories.situations.${s}.lines.${i}`" class="workshop-line">{{ line }}</span>{{ ' ' }}
        </template>
      </li>
    </ul>
  </section>
</template>
