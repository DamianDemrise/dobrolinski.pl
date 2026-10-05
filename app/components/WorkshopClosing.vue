<script setup lang="ts">
import { siteContent, workshopMailHref } from '~/content/site'

const { audience, closing } = siteContent.workshop
</script>

<template>
  <section class="workshop-section workshop-audience" aria-labelledby="workshop-audience-title">
    <h2 id="workshop-audience-title" class="workshop-heading reveal">{{ audience.title }}</h2>
    <div class="workshop-audience__body reveal">
      <p class="workshop-audience__lead">{{ audience.lead }}</p>
      <p class="workshop-audience__text">{{ audience.text }}</p>
    </div>
  </section>

  <section class="workshop-section workshop-closing" aria-labelledby="workshop-closing-title">
    <h2 id="workshop-closing-title" class="workshop-closing__title reveal">{{ closing.title }}</h2>
    <p class="workshop-closing__text reveal">{{ closing.text }}</p>
    <div class="workshop-closing__actions reveal">
      <a class="workshop-link workshop-link--large" :href="workshopMailHref">
        {{ closing.cta }}
        <span aria-hidden="true">→</span>
      </a>
      <address class="workshop-closing__contact">
        <a :href="`mailto:${siteContent.email}`">{{ siteContent.email }}</a>
        <span aria-hidden="true">·</span>
        <a :href="siteContent.phoneHref">{{ siteContent.phoneDisplay }}</a>
      </address>
    </div>
  </section>
</template>
