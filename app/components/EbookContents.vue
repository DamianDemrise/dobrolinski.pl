<script setup lang="ts">
import type { EbookContentsProps } from '~~/cms/types'
import { vCms } from '~/cms/directive'

defineProps<{ data: EbookContentsProps }>()
</script>

<template>
  <section class="ebook-contents" aria-labelledby="ebook-contents-title">
    <h2 id="ebook-contents-title" v-cms="'eyebrow'" class="workshop-eyebrow">{{ data.eyebrow }}</h2>
    <ol class="ebook-contents__list">
      <li v-for="(item, i) in data.items" :key="item._id" class="ebook-contents__item">
        <span v-cms="`items.${i}.number`" class="ebook-contents__number">{{ item.number }}</span>
        <span v-cms="`items.${i}.title`">{{ item.title }}</span>
      </li>
    </ol>
  </section>
</template>
