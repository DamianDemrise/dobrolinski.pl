<script setup lang="ts">
import { privacy } from '~/content/privacy'

const { seo } = privacy

useSeoMeta({
  title: seo.title,
  description: seo.description,
  ogType: 'website',
  ogTitle: seo.title,
  ogDescription: seo.description,
  ogUrl: seo.url,
})

useHead({
  link: [{ rel: 'canonical', href: seo.url }],
})
</script>

<template>
  <PrivacyView />
</template>
