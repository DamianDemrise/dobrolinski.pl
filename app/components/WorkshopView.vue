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
      <ul class="workshop-topbar__areas" aria-label="Obszary">
        <li v-for="area in siteContent.areas" :key="area.slug">{{ area.label }}</li>
      </ul>
      <address class="workshop-topbar__contact">
        <a :href="`mailto:${siteContent.email}`">{{ siteContent.email }}</a>
        <span aria-hidden="true">·</span>
        <a :href="siteContent.phoneHref">{{ siteContent.phoneDisplay }}</a>
      </address>
    </header>

    <div class="workshop-hero">
      <p class="workshop-hero__eyebrow">{{ workshop.index }}</p>

      <h2 id="workshop-title" class="workshop-hero__title">
        <template v-for="line in workshop.titleLines" :key="line">
          <span class="workshop-hero__title-line">{{ line }}</span>{{ ' ' }}
        </template>
      </h2>

      <p class="workshop-hero__lead">{{ workshop.lead }}</p>

      <span class="workshop-hero__rule" aria-hidden="true" />

      <p class="workshop-hero__description">
        <template v-for="line in workshop.descriptionLines" :key="line">
          <span class="workshop-hero__description-line">{{ line }}</span>{{ ' ' }}
        </template>
      </p>

      <ul class="workshop-meta" aria-label="Informacje o warsztacie">
        <li v-for="item in workshop.meta" :key="item.icon" class="workshop-meta__item">
          <svg
            class="workshop-meta__icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <template v-if="item.icon === 'clock'">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </template>
            <template v-else-if="item.icon === 'people'">
              <circle cx="9" cy="8" r="3.2" />
              <path d="M3.5 19c0-3.2 2.5-5.5 5.5-5.5s5.5 2.3 5.5 5.5" />
              <path d="M15.5 5.2a3 3 0 0 1 0 5.6M17 13.8c2 .7 3.5 2.6 3.5 5.2" />
            </template>
            <template v-else>
              <path d="M5 19v-6M10 19V9M15 19v-8M20 19V5" />
            </template>
          </svg>
          <span>
            <template v-for="line in item.lines" :key="line">
              <span class="workshop-meta__line">{{ line }}</span>{{ ' ' }}
            </template>
          </span>
        </li>
      </ul>

      <a class="workshop-hero__cta" :href="mailHref">
        {{ workshop.cta }}
        <span aria-hidden="true">→</span>
      </a>
    </div>

    <ul class="workshop-aside" aria-hidden="true">
      <li v-for="area in siteContent.areas" :key="area.slug">{{ area.label }}.</li>
    </ul>

    <button class="back-button" type="button" @click="$emit('close')">
      <span aria-hidden="true">←</span> Wróć
    </button>
  </section>
</template>
