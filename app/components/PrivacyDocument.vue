<script setup lang="ts">
import { linkSegments } from '~~/cms/derive'
import type { PrivacyDocumentProps } from '~~/cms/types'
import { vCms } from '@demrise/cms-runtime/directive'

defineProps<{ data: PrivacyDocumentProps }>()

const isExternal = (href: string) => href.startsWith('http')
</script>

<template>
  <article class="privacy">
    <header class="privacy__header">
      <h1 id="privacy-title" v-cms="'title'" class="privacy__title">{{ data.title }}</h1>
      <p v-cms="'site'" class="privacy__site">{{ data.site }}</p>
      <p v-cms="'effectiveDate'" class="privacy__date">{{ data.effectiveDateLabel }} {{ data.effectiveDate }}</p>
    </header>

    <section v-for="(section, s) in data.sections" :id="section.anchor" :key="section._id" class="privacy__section">
      <h2 v-cms="`sections.${s}.title`" class="privacy__heading">{{ section.title }}</h2>
      <template v-for="(block, b) in section.blocks" :key="block._id">
        <p v-if="block.kind === 'text'" v-cms="`sections.${s}.blocks.${b}.text`" class="privacy__text">
          <template v-for="(part, i) in linkSegments(block.text ?? '')" :key="i">
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
          <li v-for="(item, i) in block.items ?? []" :key="item" v-cms="`sections.${s}.blocks.${b}.items.${i}`">
            <template v-for="(part, j) in linkSegments(item)" :key="j">
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
</template>
