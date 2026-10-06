<script setup lang="ts">
import { inject } from 'vue'
import { mailHref, projectIndex } from '~~/cms/derive'
import type { WorkshopHeroProps } from '~~/cms/types'
import { useCmsGlobals } from '@demrise/cms-runtime/context'
import { vCms } from '@demrise/cms-runtime/directive'
import { WORKSHOP_SHOW_CONTENT } from '~/composables/useWorkshopNav'

defineProps<{ data: WorkshopHeroProps }>()

const showContent = inject(WORKSHOP_SHOW_CONTENT, () => {})
const globals = useCmsGlobals()
const site = computed(() => globals.value.site)
const workshop = computed(() => globals.value.workshop)
const workshopMailHref = computed(() => mailHref(site.value.email, workshop.value.mailSubject))
</script>

<template>
  <div class="workshop-screen">
    <img
      class="workshop-photo"
      :src="data.image.src"
      :alt="data.image.alt"
      :width="data.image.width"
      :height="data.image.height"
      decoding="async"
    >

    <header class="workshop-topbar">
      <NuxtLink class="workshop-topbar__brand" to="/" data-track="back_home" data-track-place="brand">{{ site.name }}</NuxtLink>
      <ul class="workshop-topbar__areas" aria-label="Obszary">
        <li v-for="(area, i) in site.areas" :key="area.slug" v-cms="`globals.site.areas.${i}.label`">{{ area.label }}</li>
      </ul>
      <address class="workshop-topbar__contact">
        <a v-cms="'globals.site.email'" :href="`mailto:${site.email}`" data-track="email_click" data-track-place="workshop-topbar">{{ site.email }}</a>
        <span aria-hidden="true">·</span>
        <a v-cms="'globals.site.phoneDisplay'" :href="site.phoneHref" data-track="phone_click" data-track-place="workshop-topbar">{{ site.phoneDisplay }}</a>
      </address>
    </header>

    <div class="workshop-hero">
      <p v-cms="'globals.workshop.name'" class="workshop-eyebrow">{{ projectIndex(workshop) }}</p>

      <h1 id="workshop-title" class="workshop-hero__title">
        <template v-for="(line, i) in data.titleLines" :key="line">
          <span v-cms="`titleLines.${i}`" class="workshop-line workshop-line--nowrap">{{ line }}</span>{{ ' ' }}
        </template>
      </h1>

      <p v-cms="'lead'" class="workshop-hero__lead">{{ data.lead }}</p>

      <span class="workshop-rule" aria-hidden="true" />

      <p class="workshop-hero__description">
        <template v-for="(line, i) in data.descriptionLines" :key="line">
          <span v-cms="`descriptionLines.${i}`" class="workshop-line">{{ line }}</span>{{ ' ' }}
        </template>
      </p>

      <ul class="workshop-meta" aria-label="Informacje o warsztacie">
        <li v-for="(item, m) in data.meta" :key="item._id" class="workshop-meta__item">
          <span v-cms="`meta.${m}.label`" class="workshop-meta__label">{{ item.label }}</span>
          <span>
            <template v-for="(line, i) in item.lines" :key="line">
              <span v-cms="`meta.${m}.lines.${i}`" class="workshop-line">{{ line }}</span>{{ ' ' }}
            </template>
          </span>
        </li>
      </ul>

      <a class="workshop-link" :href="workshopMailHref" data-track="workshop_cta" data-track-place="hero">
        {{ data.cta }}
        <span aria-hidden="true">→</span>
      </a>
    </div>

    <ul class="workshop-aside" aria-hidden="true">
      <li v-for="area in site.areas" :key="area.slug">{{ area.label }}.</li>
    </ul>

    <button class="workshop-more" type="button" @click="showContent()">
      {{ data.more }}
      <span aria-hidden="true">↓</span>
    </button>
  </div>
</template>
