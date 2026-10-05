<script setup lang="ts">
import { workshop } from '~/content/workshop'

const { seo } = workshop

useSeoMeta({
  title: seo.title,
  description: seo.description,
  ogType: 'website',
  ogTitle: seo.socialTitle,
  ogDescription: seo.socialDescription,
  ogUrl: seo.url,
  ogImage: seo.image,
  ogImageType: 'image/png',
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageAlt: seo.imageAlt,
  twitterCard: 'summary_large_image',
  twitterTitle: seo.socialTitle,
  twitterDescription: seo.socialDescription,
  twitterImage: seo.image,
  twitterImageAlt: seo.imageAlt,
})

useHead({
  link: [{ rel: 'canonical', href: seo.url }],
})
</script>

<template>
  <WorkshopView />
</template>
