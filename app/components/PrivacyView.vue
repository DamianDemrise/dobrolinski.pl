<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { linkSegments, privacy } from '~/content/privacy'

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') navigateTo('/')
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

const isExternal = (href: string) => href.startsWith('http')
</script>

<template>
  <section class="view workshop-view privacy-view" aria-labelledby="privacy-title" tabindex="-1">
    <article class="privacy">
      <header class="privacy__header">
        <h1 id="privacy-title" class="privacy__title">{{ privacy.title }}</h1>
        <p class="privacy__site">{{ privacy.site }}</p>
        <p class="privacy__date">Data obowiązywania: {{ privacy.effectiveDate }}</p>
      </header>

      <section v-for="section in privacy.sections" :id="section.id" :key="section.id" class="privacy__section">
        <h2 class="privacy__heading">{{ section.title }}</h2>
        <template v-for="(block, index) in section.blocks" :key="index">
          <p v-if="typeof block === 'string'" class="privacy__text">
            <template v-for="(part, i) in linkSegments(block)" :key="i">
              <template v-if="typeof part === 'string'">{{ part }}</template>
              <a
                v-else
                :href="part.href"
                :target="isExternal(part.href) ? '_blank' : undefined"
                :rel="isExternal(part.href) ? 'noopener noreferrer' : undefined"
              >{{ part.label }}</a>
            </template>
          </p>
          <ul v-else class="privacy__list">
            <li v-for="item in block.list" :key="item">
              <template v-for="(part, i) in linkSegments(item)" :key="i">
                <template v-if="typeof part === 'string'">{{ part }}</template>
                <a
                  v-else
                  :href="part.href"
                  :target="isExternal(part.href) ? '_blank' : undefined"
                  :rel="isExternal(part.href) ? 'noopener noreferrer' : undefined"
                >{{ part.label }}</a>
              </template>
            </li>
          </ul>
        </template>
      </section>
    </article>

    <NuxtLink class="back-button" to="/" data-track="back_home" data-track-place="privacy">
      <span aria-hidden="true">←</span> {{ privacy.back }}
    </NuxtLink>
  </section>
</template>
