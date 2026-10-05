<script setup lang="ts">
import { workshop } from '~/content/workshop'

const { seo } = workshop

useSeoMeta({
  title: seo.title,
  description: seo.description,
  ogType: 'website',
  ogTitle: seo.title,
  ogDescription: seo.description,
  ogUrl: seo.url,
  twitterTitle: seo.title,
  twitterDescription: seo.description,
})

useHead({
  link: [{ rel: 'canonical', href: seo.url }],
})
</script>

<template>
  <WorkshopView />
</template>
