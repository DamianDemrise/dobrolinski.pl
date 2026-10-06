<script setup lang="ts">
import CmsPageView from '~/cms/CmsPageView'
import { useCmsPage } from '~/cms/context'
import { useCmsPageHead } from '~/cms/head'
import { hasPublishedPage } from '~/cms/published'

// Strony dodane w panelu: jeden segment adresu, publicznie dopiero po publikacji
// (content/published.json). Strony stałe mają własne pliki i wygrywają z tą trasą.
const parts = useRoute().params.slug
const slug = Array.isArray(parts) && parts.length === 1 ? parts[0]! : ''
if (!slug || !hasPublishedPage(slug)) throw createError({ statusCode: 404, statusMessage: 'Nie znaleziono', fatal: true })

const page = useCmsPage(slug)
useCmsPageHead(page, 'website')
</script>

<template>
  <CmsPageView :page="page" />
</template>
