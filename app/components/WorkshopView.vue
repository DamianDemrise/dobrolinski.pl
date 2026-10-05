<script setup lang="ts">
import { siteContent } from '~/content/site'

defineEmits<{ close: [] }>()

const { workshop } = siteContent
const mailHref = `mailto:${siteContent.email}?subject=${encodeURIComponent(workshop.mailSubject)}`
</script>

<template>
  <section
    class="view workshop-view"
    aria-labelledby="workshop-title"
    tabindex="-1"
  >
    <header class="workshop-topbar">
      <span class="workshop-topbar__brand">{{ siteContent.name }}</span>
      <span class="workshop-topbar__index">{{ workshop.index }}</span>
    </header>

    <div class="workshop-hero">
      <div class="workshop-hero__content">
        <p class="workshop-hero__eyebrow">{{ workshop.eyebrow }}</p>

        <h2 id="workshop-title" class="workshop-hero__title">
          <template v-for="line in workshop.titleLines" :key="line">
            <span class="workshop-hero__title-line">{{ line }}</span>{{ ' ' }}
          </template>
        </h2>

        <p class="workshop-hero__lead">{{ workshop.lead }}</p>

        <p class="workshop-hero__description">{{ workshop.description }}</p>

        <dl class="workshop-meta" aria-label="Informacje o warsztacie">
          <div
            v-for="item in workshop.meta"
            :key="item.label"
            class="workshop-meta__item"
          >
            <dt class="workshop-meta__label">{{ item.label }}</dt>
            <dd>{{ item.value }}</dd>
          </div>
        </dl>

        <a class="workshop-hero__cta" :href="mailHref">
          {{ workshop.cta }}
          <span aria-hidden="true">→</span>
        </a>
      </div>

      <div class="workshop-hero__visual" aria-hidden="true">
        <span class="workshop-hero__number">{{ workshop.visualNumber }}</span>
        <span class="workshop-hero__word">{{ workshop.visualWord }}</span>
      </div>
    </div>

    <button class="back-button" type="button" @click="$emit('close')">
      <span aria-hidden="true">←</span> WRÓĆ
    </button>
  </section>
</template>
