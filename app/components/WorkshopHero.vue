<script setup lang="ts">
import { siteContent } from '~/content/site'
import { workshop, workshopMailHref } from '~/content/workshop'

defineEmits<{ more: [] }>()

const { hero } = workshop
</script>

<template>
  <div class="workshop-screen">
    <img
      class="workshop-photo"
      src="/workshop/poznaj-czlowieka.webp"
      alt=""
      width="716"
      height="930"
      decoding="async"
    >

    <header class="workshop-topbar">
      <NuxtLink class="workshop-topbar__brand" to="/" data-track="back_home" data-track-place="brand">{{ siteContent.name }}</NuxtLink>
      <ul class="workshop-topbar__areas" aria-label="Obszary">
        <li v-for="area in siteContent.areas" :key="area.slug">{{ area.label }}</li>
      </ul>
      <address class="workshop-topbar__contact">
        <a :href="`mailto:${siteContent.email}`" data-track="email_click" data-track-place="workshop-topbar">{{ siteContent.email }}</a>
        <span aria-hidden="true">·</span>
        <a :href="siteContent.phoneHref" data-track="phone_click" data-track-place="workshop-topbar">{{ siteContent.phoneDisplay }}</a>
      </address>
    </header>

    <div class="workshop-hero">
      <p class="workshop-eyebrow">{{ workshop.index }}</p>

      <h1 id="workshop-title" class="workshop-hero__title">
        <template v-for="line in hero.titleLines" :key="line">
          <span class="workshop-line workshop-line--nowrap">{{ line }}</span>{{ ' ' }}
        </template>
      </h1>

      <p class="workshop-hero__lead">{{ hero.lead }}</p>

      <span class="workshop-rule" aria-hidden="true" />

      <p class="workshop-hero__description">
        <template v-for="line in hero.descriptionLines" :key="line">
          <span class="workshop-line">{{ line }}</span>{{ ' ' }}
        </template>
      </p>

      <ul class="workshop-meta" aria-label="Informacje o warsztacie">
        <li v-for="item in hero.meta" :key="item.label" class="workshop-meta__item">
          <span class="workshop-meta__label">{{ item.label }}</span>
          <span>
            <template v-for="line in item.lines" :key="line">
              <span class="workshop-line">{{ line }}</span>{{ ' ' }}
            </template>
          </span>
        </li>
      </ul>

      <a class="workshop-link" :href="workshopMailHref" data-track="workshop_cta" data-track-place="hero">
        {{ hero.cta }}
        <span aria-hidden="true">→</span>
      </a>
    </div>

    <ul class="workshop-aside" aria-hidden="true">
      <li v-for="area in siteContent.areas" :key="area.slug">{{ area.label }}.</li>
    </ul>

    <button class="workshop-more" type="button" @click="$emit('more')">
      {{ hero.more }}
      <span aria-hidden="true">↓</span>
    </button>
  </div>
</template>
