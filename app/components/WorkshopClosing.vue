<script setup lang="ts">
import { mailHref, projectIndex } from '~~/cms/derive'
import type { WorkshopClosingProps } from '~~/cms/types'
import { useCmsGlobals } from '~/cms/context'
import { vCms } from '~/cms/directive'

// Dwa korzenie (sekcja i epilog): klasy widoczności z CMS trafiają na oba.
defineOptions({ inheritAttrs: false })
defineProps<{ data: WorkshopClosingProps }>()

const globals = useCmsGlobals()
const site = computed(() => globals.value.site)
const workshop = computed(() => globals.value.workshop)
const workshopMailHref = computed(() => mailHref(site.value.email, workshop.value.mailSubject))
</script>

<template>
  <section class="workshop-section workshop-closing" :class="$attrs.class" aria-labelledby="workshop-closing-title">
    <p v-cms="'globals.workshop.name'" class="workshop-eyebrow reveal">{{ projectIndex(workshop) }}</p>
    <h2 id="workshop-closing-title" v-cms="'title'" class="workshop-closing__title reveal">{{ data.title }}</h2>
    <div class="workshop-closing__text reveal">
      <p v-for="(paragraph, i) in data.paragraphs" :key="paragraph" v-cms="`paragraphs.${i}`">{{ paragraph }}</p>
    </div>
    <div class="workshop-closing__actions reveal">
      <a
        class="workshop-link workshop-link--large"
        :href="workshopMailHref"
        data-track="workshop_cta"
        data-track-place="closing"
      >
        {{ data.cta }}
        <span aria-hidden="true">→</span>
      </a>
      <a
        v-cms="'globals.site.email'"
        class="workshop-closing__mail"
        :href="workshopMailHref"
        data-track="email_click"
        data-track-place="workshop-closing"
      >{{ site.email }}</a>
    </div>

    <!-- Oferta PDF: na końcu, po przeczytaniu całości, jako druga droga obok rozmowy. -->
    <ClientOnly>
      <WorkshopOfferForm :offer="data.offer" />
    </ClientOnly>
  </section>

  <footer class="workshop-epilogue" :class="$attrs.class" aria-label="Na koniec">
    <p class="reveal">
      <template v-for="(line, i) in data.epilogue" :key="line">
        <span v-cms="`epilogue.${i}`" class="workshop-line">{{ line }}</span>{{ ' ' }}
      </template>
    </p>
    <p class="workshop-epilogue__legal">
      <NuxtLink class="privacy-link" :to="site.legal.privacyHref">{{ site.legal.privacyLabel }}</NuxtLink>
    </p>
  </footer>
</template>
