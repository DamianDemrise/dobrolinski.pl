<script setup lang="ts">
import { siteContent } from '~/content/site'
import { workshop, workshopMailHref } from '~/content/workshop'

const { closing } = workshop
</script>

<template>
  <section class="workshop-section workshop-closing" aria-labelledby="workshop-closing-title">
    <p class="workshop-eyebrow reveal">{{ workshop.index }}</p>
    <h2 id="workshop-closing-title" class="workshop-closing__title reveal">{{ closing.title }}</h2>
    <div class="workshop-closing__text reveal">
      <p v-for="paragraph in closing.paragraphs" :key="paragraph">{{ paragraph }}</p>
    </div>
    <div class="workshop-closing__actions reveal">
      <a
        class="workshop-link workshop-link--large"
        :href="workshopMailHref"
        data-track="workshop_cta"
        data-track-place="closing"
      >
        {{ closing.cta }}
        <span aria-hidden="true">→</span>
      </a>
      <a
        class="workshop-closing__mail"
        :href="workshopMailHref"
        data-track="email_click"
        data-track-place="workshop-closing"
      >{{ siteContent.email }}</a>
    </div>
  </section>

  <footer class="workshop-epilogue" aria-label="Na koniec">
    <p class="reveal">
      <template v-for="line in workshop.epilogue" :key="line">
        <span class="workshop-line">{{ line }}</span>{{ ' ' }}
      </template>
    </p>
    <p class="workshop-epilogue__legal">
      <NuxtLink class="privacy-link" to="/polityka-prywatnosci">Polityka prywatności</NuxtLink>
    </p>
  </footer>
</template>
